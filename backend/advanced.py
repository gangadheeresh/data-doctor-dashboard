import pandas as pd
import numpy as np
from flask import Blueprint, request, jsonify, g
from database import db
from models import Dataset
from auth import login_required
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

advanced_bp = Blueprint('advanced', __name__)

@advanced_bp.route('/<int:dataset_id>/cluster', methods=['POST'])
@login_required
def cluster_dataset(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    data = request.get_json() or {}
    columns = data.get('columns', [])
    k = data.get('k', 3)
    
    if not columns or len(columns) < 2:
        return jsonify({'error': 'At least 2 numeric columns are required for clustering'}), 400
        
    try:
        if dataset.filepath.endswith('.csv'):
            df = pd.read_csv(dataset.filepath)
        else:
            df = pd.read_excel(dataset.filepath)
            
        # Filter and drop missing values in chosen columns
        cluster_df = df[columns].copy()
        for col in columns:
            cluster_df[col] = pd.to_numeric(cluster_df[col], errors='coerce')
        cluster_df.dropna(inplace=True)
        
        if len(cluster_df) < k:
            return jsonify({'error': f'Not enough valid rows ({len(cluster_df)}) to form {k} clusters'}), 400
            
        # Standardize features
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(cluster_df)
        
        # Fit KMeans
        kmeans = KMeans(n_clusters=k, random_state=42, n_init='auto')
        cluster_labels = kmeans.fit_predict(scaled_data)
        
        # PCA for 2D plotting
        pca = PCA(n_components=2)
        pca_coords = pca.fit_transform(scaled_data)
        
        # Build results
        # To prevent browser freezes and huge payload transfers, sample max 3000 points for visualization
        total_points = len(cluster_df)
        sample_indices = range(total_points)
        if total_points > 3000:
            np.random.seed(42)
            sample_indices = np.random.choice(total_points, size=3000, replace=False)
            
        pca_x_list = pca_coords[:, 0].tolist()
        pca_y_list = pca_coords[:, 1].tolist()
        cluster_labels_list = cluster_labels.tolist()
        
        # Convert df to dictionary records for fast O(1) row access
        records = cluster_df[columns].to_dict('records')
        
        points = []
        for idx in sample_indices:
            i = int(idx)
            pt = {
                'pca_x': pca_x_list[i],
                'pca_y': pca_y_list[i],
                'cluster': cluster_labels_list[i]
            }
            # Append original values
            record = records[i]
            for col in columns:
                val = record[col]
                pt[col] = float(val) if (val is not None and not pd.isna(val)) else None
            points.append(pt)
            
        # Calculate cluster summaries
        cluster_df['cluster'] = cluster_labels
        summaries = []
        for c in range(k):
            cluster_subset = cluster_df[cluster_df['cluster'] == c]
            summary = {
                'cluster_id': c,
                'count': len(cluster_subset),
                'percentage': float(len(cluster_subset) / len(cluster_df) * 100),
                'means': {}
            }
            for col in columns:
                summary['means'][col] = float(cluster_subset[col].mean()) if not pd.isna(cluster_subset[col].mean()) else None
            summaries.append(summary)
            
        # PCA Explained Variance
        explained_variance = float(pca.explained_variance_ratio_.sum() * 100)
        
        return jsonify({
            'points': points,
            'summaries': summaries,
            'explained_variance': explained_variance,
            'columns': columns
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Clustering failed: {str(e)}'}), 500

@advanced_bp.route('/<int:dataset_id>/cohort', methods=['POST'])
@login_required
def cohort_analysis(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    data = request.get_json() or {}
    user_col = data.get('user_column')
    date_col = data.get('date_column')  # Transaction/Activity date
    
    if not user_col or not date_col:
        return jsonify({'error': 'user_column and date_column are required'}), 400
        
    try:
        # Optimization: Only load the 2 required columns from disk to save memory and I/O time
        if dataset.filepath.endswith('.csv'):
            df = pd.read_csv(dataset.filepath, usecols=[user_col, date_col])
        else:
            df = pd.read_excel(dataset.filepath, usecols=[user_col, date_col])
            
        if user_col not in df.columns or date_col not in df.columns:
            return jsonify({'error': 'Specified columns do not exist in dataset'}), 400
            
        # Clean columns
        df = df[[user_col, date_col]].copy()
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df.dropna(subset=[user_col, date_col], inplace=True)
        
        if len(df) < 5:
            return jsonify({'error': 'Insufficient data for cohort analysis'}), 400
            
        # Get cohort month (first purchase month) per user
        df['activity_month'] = df[date_col].dt.to_period('M')
        user_cohort = df.groupby(user_col)['activity_month'].min().rename('cohort_month')
        df = df.join(user_cohort, on=user_col)
        
        # Calculate periods
        df['cohort_month_dt'] = df['cohort_month'].dt.to_timestamp()
        df['activity_month_dt'] = df['activity_month'].dt.to_timestamp()
        
        df['period'] = ((df['activity_month_dt'].dt.year - df['cohort_month_dt'].dt.year) * 12 +
                        (df['activity_month_dt'].dt.month - df['cohort_month_dt'].dt.month))
        
        # Group by cohort and period
        cohort_group = df.groupby(['cohort_month', 'period'])[user_col].nunique().reset_index()
        
        # Pivot table
        cohort_pivot = cohort_group.pivot(index='cohort_month', columns='period', values=user_col)
        cohort_sizes = cohort_pivot.iloc[:, 0]
        
        # Calculate retention rate
        retention = cohort_pivot.divide(cohort_sizes, axis=0)
        
        # Format output
        matrix = []
        for idx, row in cohort_pivot.iterrows():
            cohort_name = str(idx)
            total_users = int(cohort_sizes.loc[idx])
            
            row_retention = retention.loc[idx]
            periods_list = []
            for p, size in row.items():
                if not np.isnan(size):
                    rate = float(row_retention.loc[p])
                    periods_list.append({
                        'period': int(p),
                        'active_users': int(size),
                        'retention_rate': rate
                    })
            matrix.append({
                'cohort': cohort_name,
                'total_users': total_users,
                'retention': periods_list
            })
            
        # Sort matrix by cohort date descending
        matrix.sort(key=lambda x: x['cohort'], reverse=True)
        
        return jsonify({
            'cohort_matrix': matrix
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Cohort analysis failed: {str(e)}'}), 500
