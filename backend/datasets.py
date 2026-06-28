import os
import json
import pandas as pd
import numpy as np
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from database import db
from models import Dataset
from auth import login_required

datasets_bp = Blueprint('datasets', __name__)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in current_app.config['ALLOWED_EXTENSIONS']

def clean_json_value(val):
    """Serialize numpy types and float NaNs properly to JSON compatible types."""
    if isinstance(val, (np.integer, np.int64)):
        return int(val)
    elif isinstance(val, (np.floating, np.float64)):
        if np.isnan(val) or np.isinf(val):
            return None
        return float(val)
    elif isinstance(val, np.bool_):
        return bool(val)
    elif pd.isna(val):
        return None
    return val

def infer_column_types(df):
    """
    Intelligently infer column data types.
    Returns: dict mapping column_name -> data_type ('numeric', 'date', 'categorical', 'boolean', 'text')
    """
    inferred_types = {}
    row_count = len(df)
    
    for col in df.columns:
        # Check if already a datetime type
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            inferred_types[col] = 'date'
            continue
            
        non_null_series = df[col].dropna()
        if len(non_null_series) == 0:
            inferred_types[col] = 'text'
            continue
            
        # 1. Check if Boolean
        distinct_vals = non_null_series.unique()
        distinct_vals_set = set([str(x).lower().strip() for x in distinct_vals])
        if len(distinct_vals) <= 2 and distinct_vals_set.issubset({'true', 'false', 'yes', 'no', '1', '0', 't', 'f', '1.0', '0.0'}):
            inferred_types[col] = 'boolean'
            continue
            
        # 2. Check if Date
        # First check name heuristic
        col_lower = str(col).lower()
        is_date_name = any(k in col_lower for k in ['date', 'time', 'year', 'month', 'created', 'updated', 'timestamp'])
        
        try:
            # If name matches or it's object type, try parsing a sample as date
            if is_date_name or df[col].dtype == 'object':
                sample_size = min(100, len(non_null_series))
                sample = non_null_series.sample(sample_size, random_state=42)
                parsed_sample = pd.to_datetime(sample, errors='coerce')
                # If more than 80% parsed successfully
                if parsed_sample.notna().sum() / sample_size >= 0.8:
                    # Check for epoch false positive (e.g. phone numbers or IDs parsed as nanoseconds)
                    valid_dates = parsed_sample.dropna()
                    if not valid_dates.empty and valid_dates.min().year == 1970 and valid_dates.max().year == 1970:
                        contains_1970 = sample.astype(str).str.contains('1970').any()
                        if not contains_1970:
                            # False positive epoch parse, let it fall through to numeric/text checks
                            pass
                        else:
                            inferred_types[col] = 'date'
                            continue
                    else:
                        inferred_types[col] = 'date'
                        continue
        except Exception:
            pass
            
        # 3. Check if Numeric
        # Try converting to numeric
        converted_numeric = pd.to_numeric(non_null_series, errors='coerce')
        if converted_numeric.notna().sum() / len(non_null_series) >= 0.9:
            inferred_types[col] = 'numeric'
            continue
            
        # 4. Check if Categorical
        # If text column with low cardinality
        cardinality = len(distinct_vals)
        if cardinality < 20 or (cardinality < 100 and cardinality / row_count < 0.05):
            inferred_types[col] = 'categorical'
        else:
            inferred_types[col] = 'text'
            
    return inferred_types

def generate_metadata_and_dictionary(df):
    """
    Generate dataset KPIs, column summaries, and a data dictionary.
    """
    inferred_types = infer_column_types(df)
    row_count, col_count = df.shape
    
    # Calculate missing values info
    missing_counts = df.isnull().sum().to_dict()
    
    columns_metadata = {}
    data_dictionary = []
    
    for col in df.columns:
        dtype = inferred_types[col]
        series = df[col]
        non_null_count = int(series.count())
        null_count = int(missing_counts[col])
        null_percent = float((null_count / row_count) * 100) if row_count > 0 else 0.0
        unique_count = int(series.nunique())
        
        col_meta = {
            'type': dtype,
            'null_count': null_count,
            'null_percent': null_percent,
            'unique_count': unique_count,
            'sample_values': [clean_json_value(x) for x in series.dropna().head(5).tolist()]
        }
        
        # Stats summary depending on type
        if dtype == 'numeric':
            numeric_series = pd.to_numeric(series, errors='coerce')
            col_meta['summary'] = {
                'min': clean_json_value(numeric_series.min()),
                'max': clean_json_value(numeric_series.max()),
                'mean': clean_json_value(numeric_series.mean()),
                'std': clean_json_value(numeric_series.std()),
                'median': clean_json_value(numeric_series.median()),
                'q25': clean_json_value(numeric_series.quantile(0.25)),
                'q75': clean_json_value(numeric_series.quantile(0.75)),
            }
        elif dtype == 'date':
            try:
                date_series = pd.to_datetime(series, errors='coerce')
                col_meta['summary'] = {
                    'min': clean_json_value(date_series.min().isoformat()) if date_series.min() is not pd.NaT else None,
                    'max': clean_json_value(date_series.max().isoformat()) if date_series.max() is not pd.NaT else None,
                }
            except Exception:
                col_meta['summary'] = {}
        elif dtype == 'categorical' or dtype == 'boolean' or dtype == 'text':
            # Frequency counts for top 10 values
            top_values = series.value_counts().head(10).to_dict()
            col_meta['summary'] = {
                'top_values': {str(k): int(v) for k, v in top_values.items()}
            }
            
        columns_metadata[col] = col_meta
        
        data_dictionary.append({
            'column_name': col,
            'detected_type': dtype,
            'null_percentage': null_percent,
            'unique_values': unique_count,
            'description': f"Dataset column '{col}' representing {dtype} data."
        })
        
    total_nulls = int(df.isnull().sum().sum())
    total_cells = row_count * col_count
    null_rate = float(total_nulls / total_cells * 100) if total_cells > 0 else 0.0
    
    metadata = {
        'row_count': row_count,
        'col_count': col_count,
        'total_nulls': total_nulls,
        'null_rate': null_rate,
        'duplicate_count': int(df.duplicated().sum()),
        'columns': columns_metadata,
        'data_dictionary': data_dictionary
    }
    
    return metadata

@datasets_bp.route('/upload', methods=['POST'])
@login_required
def upload_dataset():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected for uploading'}), 400
        
    if not allowed_file(file.filename):
        return jsonify({'error': 'Allowed file types are CSV, XLSX, XLS'}), 400
        
    filename = secure_filename(file.filename)
    user_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(g.user.id))
    os.makedirs(user_dir, exist_ok=True)
    
    filepath = os.path.join(user_dir, filename)
    
    # Save the file
    try:
        file.save(filepath)
        file_size = os.path.getsize(filepath)
    except Exception as e:
        return jsonify({'error': f'Failed to save file: {str(e)}'}), 500
        
    # Process and build metadata
    # Process and build metadata
    try:
        # Load sample/data efficiently to prevent OOM on massive files
        if filename.endswith('.csv'):
            # Fast row count without loading into Pandas memory
            try:
                with open(filepath, 'rb') as f:
                    total_rows = max(0, sum(1 for _ in f) - 1) # subtract header
            except Exception:
                total_rows = 0
                
            if total_rows == 0:
                raise ValueError("The uploaded CSV file appears to be empty or corrupted.")

            # Try different encodings for robust parsing
            encodings = ['utf-8', 'latin1', 'cp1252', 'iso-8859-1']
            meta_df = None
            last_err = None
            
            for enc in encodings:
                try:
                    meta_df = pd.read_csv(filepath, nrows=10000, encoding=enc, on_bad_lines='skip')
                    if not meta_df.empty:
                        break
                except Exception as e:
                    last_err = e
                    continue
                    
            if meta_df is None or meta_df.empty:
                raise ValueError(f"Could not parse CSV file. Ensure it is a valid text CSV, not a renamed Excel file. Detailed Error: {str(last_err)}")
                
            total_cols = len(meta_df.columns)
        else:
            try:
                meta_df = pd.read_excel(filepath)
            except Exception as e:
                raise ValueError(f"Could not parse Excel file. Ensure it is a valid .xlsx file. Detailed Error: {str(e)}")
                
            if meta_df.empty:
                raise ValueError("The uploaded Excel file appears to be empty.")
                
            total_rows = len(meta_df)
            total_cols = len(meta_df.columns)
            if total_rows > 10000:
                meta_df = meta_df.sample(n=10000, random_state=42)
            
        metadata = generate_metadata_and_dictionary(meta_df)
        
        # Ensure true row/col counts are saved, overriding the sample counts
        metadata['row_count'] = total_rows
        metadata['col_count'] = total_cols
        
        # Save to Database
        dataset = Dataset(
            user_id=g.user.id,
            filename=filename,
            filepath=filepath,
            file_size=file_size,
            row_count=total_rows,
            col_count=total_cols
        )
        dataset.set_metadata(metadata)
        db.session.add(dataset)
        db.session.commit()
        
        return jsonify({
            'message': 'Dataset uploaded and parsed successfully',
            'dataset': dataset.to_dict()
        }), 201
        
    except ValueError as ve:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(ve)}), 400
    except Exception as e:
        # Cleanup file if db write failed
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': f'An unexpected internal error occurred: {str(e)}'}), 500

@datasets_bp.route('', methods=['GET'])
@login_required
def list_datasets():
    datasets = Dataset.query.filter_by(user_id=g.user.id).order_by(Dataset.created_at.desc()).all()
    return jsonify([d.to_dict() for d in datasets]), 200

@datasets_bp.route('/<int:dataset_id>', methods=['GET'])
@login_required
def get_dataset(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
    return jsonify(dataset.to_dict()), 200

@datasets_bp.route('/<int:dataset_id>/preview', methods=['GET'])
@login_required
def get_preview(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)
    
    try:
        if dataset.filepath.endswith('.csv'):
            # Only read what we need for preview
            df = pd.read_csv(dataset.filepath, nrows=offset+limit)
        else:
            df = pd.read_excel(dataset.filepath)
            
        # Slice
        df_preview = df.iloc[offset:offset+limit]
        
        # Replace NaNs/Infs for JSON compatibility
        # convert df to records
        records = []
        for idx, row in df_preview.iterrows():
            record = {}
            for col in df.columns:
                record[col] = clean_json_value(row[col])
            records.append(record)
            
        return jsonify({
            'total_rows': dataset.row_count, # Use DB count
            'columns': list(df.columns),
            'data': records,
            'limit': limit,
            'offset': offset
        }), 200
    except Exception as e:
        return jsonify({'error': f'Failed to load preview: {str(e)}'}), 500

@datasets_bp.route('/<int:dataset_id>/chart-data', methods=['POST'])
@login_required
def get_chart_data(dataset_id):
    """Return aggregated/sampled data for chart building."""
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404

    body = request.get_json() or {}
    x_col = body.get('x')
    y_col = body.get('y')
    color_col = body.get('color')
    chart_type = body.get('type', 'bar')
    aggregation = body.get('aggregation', 'none')
    columns = body.get('columns')  # for heatmap

    # Row range selection
    row_mode = body.get('row_mode', 'all')   # 'all' | 'first' | 'last' | 'custom'
    row_n    = int(body.get('row_n', 5000) or 5000)
    row_from = int(body.get('row_from', 0) or 0)
    row_to   = int(body.get('row_to', 5000) or 5000)

    try:
        total_rows = dataset.row_count
        
        if dataset.filepath.endswith('.csv'):
            # Extremely memory efficient reading based on row_mode
            if row_mode == 'first':
                df = pd.read_csv(dataset.filepath, nrows=max(1, row_n))
            elif row_mode == 'custom':
                df = pd.read_csv(dataset.filepath, skiprows=range(1, row_from + 1), nrows=row_to - row_from)
            else:
                # 'all' or 'last': Just load 10000 rows to prevent OOM
                df = pd.read_csv(dataset.filepath, nrows=10000)
        else:
            df = pd.read_excel(dataset.filepath)
            if row_mode == 'first':
                df = df.iloc[:max(1, row_n)]
            elif row_mode == 'last':
                df = df.iloc[max(0, total_rows - row_n):]
            elif row_mode == 'custom':
                rf = max(0, min(row_from, total_rows - 1))
                rt = max(rf + 1, min(row_to, total_rows))
                df = df.iloc[rf:rt]

        # Cast types from metadata
        meta = dataset.get_metadata()
        col_types = {col: item['type'] for col, item in meta.get('columns', {}).items()}
        for col, t in col_types.items():
            if t == 'numeric':
                df[col] = pd.to_numeric(df[col], errors='coerce')
            elif t == 'date':
                df[col] = pd.to_datetime(df[col], errors='coerce')

        # Heatmap: return correlation matrix
        if chart_type == 'heatmap':
            num_cols = columns if columns else [c for c, t in col_types.items() if t == 'numeric']
            num_cols = [c for c in num_cols if c in df.columns]
            if len(num_cols) < 2:
                return jsonify({'error': 'Need at least 2 numeric columns for heatmap'}), 400
            corr = df[num_cols].corr().round(4)
            records = []
            for col1 in num_cols:
                for col2 in num_cols:
                    records.append({'x': col1, 'y': col2, 'z': float(corr.loc[col1, col2]) if not pd.isna(corr.loc[col1, col2]) else 0.0})
            return jsonify({'rows': records, 'columns': num_cols, 'total_rows': len(records)}), 200

        # For histogram: just need x column values
        if chart_type == 'histogram':
            if not x_col or x_col not in df.columns:
                return jsonify({'error': f'Column {x_col} not found'}), 400
            sample = df[[x_col]].dropna().head(5000)
            records = [{x_col: clean_json_value(r)} for r in sample[x_col]]
            return jsonify({'rows': records, 'total_rows': total_rows, 'selected_rows': len(df)}), 200

        # Validate required columns
        if not x_col or x_col not in df.columns:
            return jsonify({'error': f'X column "{x_col}" not found'}), 400
        if y_col and y_col not in df.columns:
            return jsonify({'error': f'Y column "{y_col}" not found'}), 400

        # Apply aggregation
        if aggregation != 'none' and x_col and y_col:
            group_cols = [x_col]
            if color_col and color_col in df.columns:
                group_cols.append(color_col)
            agg_map = {'sum': 'sum', 'mean': 'mean', 'count': 'count', 'max': 'max', 'min': 'min'}
            agg_func = agg_map.get(aggregation, 'sum')
            grouped = df.groupby(group_cols)[y_col].agg(agg_func).reset_index()
            grouped = grouped.dropna(subset=[y_col]).head(500)
            records = []
            for _, row in grouped.iterrows():
                record = {}
                for col in grouped.columns:
                    record[col] = clean_json_value(row[col])
                records.append(record)
        else:
            # Raw sample â€” limit to 5000 rows for performance
            use_cols = [c for c in [x_col, y_col, color_col] if c and c in df.columns]
            sample_df = df[use_cols].dropna(subset=[x_col]).head(5000)
            records = []
            for _, row in sample_df.iterrows():
                record = {}
                for col in use_cols:
                    record[col] = clean_json_value(row[col])
                records.append(record)

        return jsonify({'rows': records, 'total_rows': total_rows, 'selected_rows': len(df)}), 200

    except Exception as e:
        return jsonify({'error': f'Failed to build chart data: {str(e)}'}), 500

@datasets_bp.route('/<int:dataset_id>', methods=['DELETE'])
@login_required
def delete_dataset(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    try:
        # Delete local file
        if os.path.exists(dataset.filepath):
            os.remove(dataset.filepath)
        db.session.delete(dataset)
        db.session.commit()
        return jsonify({'message': 'Dataset deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to delete dataset: {str(e)}'}), 500

@datasets_bp.route('/<int:dataset_id>/cleaning-suggestions', methods=['GET'])
@login_required
def get_cleaning_suggestions(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    try:
        if dataset.filepath.endswith('.csv'):
            df = pd.read_csv(dataset.filepath)
        else:
            df = pd.read_excel(dataset.filepath)
            
        suggestions = {
            'duplicate_count': int(df.duplicated().sum()),
            'missing_values': {},
            'outliers': {},
            'type_mismatches': {}
        }
        
        # Missing values detection
        null_counts = df.isnull().sum()
        for col, count in null_counts.items():
            if count > 0:
                suggestions['missing_values'][col] = {
                    'count': int(count),
                    'percentage': float((count / len(df)) * 100),
                    'imputation_strategies': ['drop', 'fill_mean', 'fill_median', 'fill_mode'] if pd.api.types.is_numeric_dtype(df[col]) else ['drop', 'fill_mode']
                }
                
        # Outlier detection (using IQR for numeric columns)
        inferred_types = infer_column_types(df)
        for col in df.columns:
            if inferred_types[col] == 'numeric':
                numeric_col = pd.to_numeric(df[col], errors='coerce').dropna()
                if len(numeric_col) > 0:
                    q1 = numeric_col.quantile(0.25)
                    q3 = numeric_col.quantile(0.75)
                    iqr = q3 - q1
                    lower_bound = q1 - 1.5 * iqr
                    upper_bound = q3 + 1.5 * iqr
                    outliers = numeric_col[(numeric_col < lower_bound) | (numeric_col > upper_bound)]
                    outlier_count = len(outliers)
                    if outlier_count > 0:
                        suggestions['outliers'][col] = {
                            'count': outlier_count,
                            'percentage': float((outlier_count / len(df)) * 100),
                            'lower_bound': float(lower_bound),
                            'upper_bound': float(upper_bound)
                        }
                        
        return jsonify(suggestions), 200
    except Exception as e:
        return jsonify({'error': f'Failed to generate suggestions: {str(e)}'}), 500

@datasets_bp.route('/<int:dataset_id>/clean', methods=['POST'])
@login_required
def clean_dataset(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    instructions = request.get_json() or {}
    remove_duplicates = instructions.get('remove_duplicates', False)
    impute_missing = instructions.get('impute_missing', {})  # col_name -> strategy ('drop', 'mean', 'median', 'mode')
    remove_outliers = instructions.get('remove_outliers', [])  # list of columns to strip outliers from
    type_corrections = instructions.get('type_corrections', {})  # col_name -> type ('numeric', 'date', 'text')
    
    try:
        if dataset.filepath.endswith('.csv'):
            df = pd.read_csv(dataset.filepath)
        else:
            df = pd.read_excel(dataset.filepath)
            
        # 1. Apply Type Corrections
        for col, target_type in type_corrections.items():
            if col in df.columns:
                if target_type == 'numeric':
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                elif target_type == 'date':
                    df[col] = pd.to_datetime(df[col], errors='coerce')
                elif target_type == 'text':
                    df[col] = df[col].astype(str)
                    
        # 2. Impute Missing Values
        for col, strategy in impute_missing.items():
            if col in df.columns:
                if strategy == 'drop':
                    df = df.dropna(subset=[col])
                elif strategy == 'mean':
                    df[col] = df[col].fillna(df[col].mean())
                elif strategy == 'median':
                    df[col] = df[col].fillna(df[col].median())
                elif strategy == 'mode':
                    if not df[col].mode().empty:
                        df[col] = df[col].fillna(df[col].mode()[0])
                        
        # 3. Remove Outliers
        for col in remove_outliers:
            if col in df.columns:
                numeric_col = pd.to_numeric(df[col], errors='coerce')
                q1 = numeric_col.quantile(0.25)
                q3 = numeric_col.quantile(0.75)
                iqr = q3 - q1
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                df = df[(numeric_col >= lower_bound) & (numeric_col <= upper_bound)]
                
        # 4. Remove Duplicates
        if remove_duplicates:
            df = df.drop_duplicates()
            
        # Save back the cleaned file
        df.reset_index(drop=True, inplace=True)
        
        # Save file (overwrite existing or save version - let's update current filepath)
        if dataset.filepath.endswith('.csv'):
            df.to_csv(dataset.filepath, index=False)
        else:
            df.to_excel(dataset.filepath, index=False)
            
        # Regenerate metadata
        new_metadata = generate_metadata_and_dictionary(df)
        dataset.row_count = new_metadata['row_count']
        dataset.col_count = new_metadata['col_count']
        dataset.file_size = os.path.getsize(dataset.filepath)
        dataset.set_metadata(new_metadata)
        
        db.session.commit()
        
        return jsonify({
            'message': 'Dataset cleaned successfully',
            'dataset': dataset.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to clean dataset: {str(e)}'}), 500

