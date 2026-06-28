import re
import os
import json
import pandas as pd
import numpy as np
from flask import Blueprint, request, jsonify, g
from database import db
from models import Dataset, UserSettings
from auth import login_required
from datasets import infer_column_types, clean_json_value

query_bp = Blueprint('query', __name__)

def execute_safe_python(df, code):
    """Executes code in a sandbox containing the pandas DataFrame `df` and returns the output dict."""
    local_vars = {
        'df': df,
        'pd': pd,
        'np': np,
        'result': {
            'answer': "No answer was set by the script.",
            'table': None,
            'chart': None
        }
    }
    
    # We restrict double underscore attributes
    if '__' in code:
        raise ValueError("Unsafe code execution blocked: double underscores not allowed.")
        
    # Execute the code
    exec(code, {}, local_vars)
    return local_vars['result']

def local_fallback_query(df, query, columns, col_types, api_key_configured=False):
    """Rule-based query handler that executes simple queries offline without an LLM key."""
    query_lower = query.lower()
    
    # Identify referenced columns
    matched_cols = []
    for col in columns:
        if col.lower() in query_lower:
            matched_cols.append(col)
            
    # Check numeric and categorical cols
    numeric_cols = [c for c in matched_cols if col_types.get(c) == 'numeric']
    cat_cols = [c for c in matched_cols if col_types.get(c) in ['categorical', 'text', 'boolean']]
    date_cols = [c for c in matched_cols if col_types.get(c) == 'date']
    
    # Fallback to all columns if none matched
    all_numeric = [c for c, t in col_types.items() if t == 'numeric']
    all_cat = [c for c, t in col_types.items() if t in ['categorical', 'text', 'boolean']]
    all_date = [c for c, t in col_types.items() if t == 'date']
    
    # 0. Greetings, general help, and conversational queries
    if any(k in query_lower for k in ['hello', 'hi', 'hey', 'greetings', 'who are you', 'what are you', 'help', 'what can you do']):
        eg_num = all_numeric[0] if all_numeric else "Value"
        eg_cat = all_cat[0] if all_cat else "Category"
        return {
            'answer': f"Hello! I am your AI Data Assistant running in local analysis mode.\n\nI can answer questions like:\n- 'How many rows are in the dataset?'\n- 'Show missing values'\n- 'Show correlation between columns'\n- 'What are the unique values of {eg_cat}?'\n- 'Show average of {eg_num}'\n- 'What is the min and max of {eg_num}?'\n- 'Describe the dataset'\n- 'Is there any column with name X?'\n- 'Find rows where {eg_cat} is X'\n- 'Show top 10 by {eg_num}'",
            'table': None,
            'chart': None
        }

    # 1. Row count query
    if any(k in query_lower for k in ['how many rows', 'row count', 'number of rows', 'size of dataset', 'total record']):
        return {
            'answer': f"The dataset contains {len(df):,} rows and {len(df.columns)} columns.",
            'table': None,
            'chart': None
        }
        
    # 2. Missing value query
    if any(k in query_lower for k in ['missing', 'null', 'nan', 'empty']):
        nulls = df.isnull().sum()
        cols_with_nulls = nulls[nulls > 0]
        if cols_with_nulls.empty:
            return {
                'answer': "Excellent! The dataset has zero missing values.",
                'table': None,
                'chart': None
            }
        else:
            table_data = [{'Column': col, 'Missing Count': int(cnt), 'Percentage': f"{(cnt/len(df)*100):.1f}%"} for col, cnt in cols_with_nulls.items()]
            return {
                'answer': f"There are missing values in {len(cols_with_nulls)} columns. Here is the summary:",
                'table': table_data,
                'chart': {
                    'type': 'bar',
                    'x': 'Column',
                    'y': 'Missing Count',
                    'title': 'Missing Value Count per Column'
                }
            }
            
    # 3. Correlation query
    if 'correlation' in query_lower:
        num_cols = numeric_cols if len(numeric_cols) >= 2 else all_numeric
        if len(num_cols) >= 2:
            corr_mat = df[num_cols].corr()
            # Find top correlation
            max_r = 0
            best_pair = None
            for i in range(len(num_cols)):
                for j in range(i+1, len(num_cols)):
                    r = corr_mat.iloc[i, j]
                    if abs(r) > abs(max_r) and not np.isnan(r):
                        max_r = r
                        best_pair = (num_cols[i], num_cols[j])
            
            answer = "Calculated the correlation matrix."
            if best_pair:
                answer = f"The strongest linear correlation is between '{best_pair[0]}' and '{best_pair[1]}' with a coefficient of {max_r:.2f}."
                
            return {
                'answer': answer,
                'table': [{'Column 1': c1, 'Column 2': c2, 'Correlation': float(corr_mat.loc[c1, c2])} for c1 in num_cols for c2 in num_cols if c1 != c2],
                'chart': {
                    'type': 'heatmap',
                    'columns': num_cols,
                    'title': 'Correlation Matrix Heatmap'
                }
            }

    # 3b. Min / Max query
    if any(k in query_lower for k in ['minimum', 'maximum', 'min', 'max', 'lowest', 'highest value', 'smallest', 'largest']):
        target_num = numeric_cols[0] if numeric_cols else (all_numeric[0] if all_numeric else None)
        if target_num:
            col_min = df[target_num].min()
            col_max = df[target_num].max()
            return {
                'answer': f"**{target_num}** stats:\n- Minimum: **{col_min:,.2f}**\n- Maximum: **{col_max:,.2f}**",
                'table': [{'Metric': 'Minimum', 'Value': clean_json_value(col_min)}, {'Metric': 'Maximum', 'Value': clean_json_value(col_max)}],
                'chart': None
            }

    # 3c. Sum / Total query
    if any(k in query_lower for k in ['total', 'sum of', 'sum']):
        target_num = numeric_cols[0] if numeric_cols else (all_numeric[0] if all_numeric else None)
        target_cat = cat_cols[0] if cat_cols else (all_cat[0] if all_cat else None)
        if target_num:
            if target_cat:
                grouped = df.groupby(target_cat)[target_num].sum().reset_index()
                grouped = grouped.sort_values(by=target_num, ascending=False).head(10)
                table_data = [{target_cat: clean_json_value(r[target_cat]), f"Total {target_num}": clean_json_value(r[target_num])} for _, r in grouped.iterrows()]
                return {
                    'answer': f"Total '{target_num}' grouped by '{target_cat}' (top 10):",
                    'table': table_data,
                    'chart': {'type': 'bar', 'x': target_cat, 'y': target_num, 'title': f"Total {target_num} by {target_cat}"}
                }
            else:
                total = df[target_num].sum()
                return {
                    'answer': f"The total sum of **{target_num}** across the dataset is **{total:,.2f}**.",
                    'table': None,
                    'chart': None
                }

    # 3d. Unique values / Count distinct query
    if any(k in query_lower for k in ['unique', 'distinct', 'how many different', 'unique values', 'distinct values', 'categories']):
        target_cat = cat_cols[0] if cat_cols else (all_cat[0] if all_cat else None)
        if target_cat:
            unique_vals = df[target_cat].dropna().unique()
            n_unique = len(unique_vals)
            # Show up to 20 sample unique values
            sample_vals = sorted([str(v) for v in unique_vals[:20]])
            table_data = [{'Value': v, 'Count': int(df[target_cat].value_counts().get(v, 0))} for v in sample_vals]
            return {
                'answer': f"Column **'{target_cat}'** has **{n_unique:,}** unique values." + (f" Showing first 20:" if n_unique > 20 else " All values:"),
                'table': table_data,
                'chart': {'type': 'bar', 'x': 'Value', 'y': 'Count', 'title': f"Value Frequency in {target_cat}"}
            }
        elif all_numeric:
            target_num = numeric_cols[0] if numeric_cols else all_numeric[0]
            n_unique = df[target_num].nunique()
            return {
                'answer': f"Column **'{target_num}'** has **{n_unique:,}** distinct numeric values.",
                'table': None,
                'chart': None
            }

    # 3e. Describe / Statistics / Summary query
    if any(k in query_lower for k in ['describe', 'summary', 'statistics', 'stats', 'overview', 'distribution', 'data type', 'data types', 'schema']):
        # Full describe for numeric columns
        target_num_list = numeric_cols if numeric_cols else all_numeric
        if target_num_list:
            desc = df[target_num_list].describe().round(2)
            table_data = []
            for stat_name, row in desc.iterrows():
                entry = {'Statistic': stat_name}
                for col in target_num_list:
                    entry[col] = clean_json_value(row[col])
                table_data.append(entry)
            return {
                'answer': f"**Statistical summary** for numeric columns in the dataset ({len(df):,} rows):",
                'table': table_data,
                'chart': None
            }
        else:
            # Show schema only
            schema_rows = [{'Column': c, 'Type': col_types.get(c, 'unknown'), 'Non-Null': int(df[c].notnull().sum()), 'Unique': int(df[c].nunique())} for c in columns]
            return {
                'answer': f"**Dataset Schema** ({len(df):,} rows, {len(columns)} columns):",
                'table': schema_rows,
                'chart': None
            }

    # 3f. Filter / Show rows where column = value query
    # Pattern: 'where <col> is X', 'filter by <col> X', 'rows where <col> = X'
    filter_keywords = ['where', 'filter', 'rows where', 'records where', 'show me rows', 'find rows', 'whose']
    if any(k in query_lower for k in filter_keywords):
        # Try to match a column name in the query
        filter_col = None
        for col in columns:
            if col.lower() in query_lower:
                filter_col = col
                break
        
        if filter_col:
            # Extract filter value: text after 'is', '=', 'equals', 'contains'
            value_match = re.search(
                r'(?:is|=|equals?|contains?|like)\s+["\']?([\w\s\.\-]+)["\']?',
                query_lower
            )
            if value_match:
                filter_value = value_match.group(1).strip()
                col_type = col_types.get(filter_col, '')
                try:
                    if col_type == 'numeric':
                        numeric_val = float(filter_value)
                        matches = df[df[filter_col] == numeric_val]
                    else:
                        matches = df[df[filter_col].astype(str).str.lower().str.contains(filter_value, na=False, regex=False)]
                    
                    count = len(matches)
                    if count == 0:
                        return {
                            'answer': f"No rows found where **{filter_col}** matches '{filter_value}'.",
                            'table': None,
                            'chart': None
                        }
                    table_data = [{k: clean_json_value(v) for k, v in row.items()} for _, row in matches.head(20).iterrows()]
                    return {
                        'answer': f"Found **{count:,}** rows where **'{filter_col}'** matches **'{filter_value}'**. Showing first 20:",
                        'table': table_data,
                        'chart': None
                    }
                except Exception:
                    pass

    # 3g. Count query (count of values in a column)
    if any(k in query_lower for k in ['count', 'how many', 'frequency', 'occurrences', 'distribution of']):
        target_cat = cat_cols[0] if cat_cols else (all_cat[0] if all_cat else None)
        target_num = numeric_cols[0] if numeric_cols else (all_numeric[0] if all_numeric else None)
        if target_cat:
            vc = df[target_cat].value_counts().head(15).reset_index()
            vc.columns = [target_cat, 'Count']
            table_data = [{target_cat: clean_json_value(r[target_cat]), 'Count': int(r['Count'])} for _, r in vc.iterrows()]
            return {
                'answer': f"**Value counts** for column **'{target_cat}'** (top 15 categories):",
                'table': table_data,
                'chart': {'type': 'bar', 'x': target_cat, 'y': 'Count', 'title': f"Count of {target_cat}"}
            }
        elif target_num:
            return {
                'answer': f"The column **'{target_num}'** has **{df[target_num].count():,}** non-null values out of {len(df):,} rows.",
                'table': None,
                'chart': None
            }
            
    # 4. Top 10 / Best query
    if any(k in query_lower for k in ['top', 'highest', 'best', 'most']):
        target_num = numeric_cols[0] if numeric_cols else (all_numeric[0] if all_numeric else None)
        target_cat = cat_cols[0] if cat_cols else (all_cat[0] if all_cat else None)
        
        if target_num and target_cat:
            grouped = df.groupby(target_cat)[target_num].sum().reset_index()
            top10 = grouped.sort_values(by=target_num, ascending=False).head(10)
            
            table_data = []
            for idx, r in top10.iterrows():
                table_data.append({
                    target_cat: r[target_cat],
                    target_num: clean_json_value(r[target_num])
                })
                
            return {
                'answer': f"Here are the top 10 categories in '{target_cat}' by total '{target_num}'.",
                'table': table_data,
                'chart': {
                    'type': 'bar',
                    'x': target_cat,
                    'y': target_num,
                    'title': f"Top 10 {target_cat} by {target_num}"
                }
            }
            
    # 5. Average / Mean query
    if any(k in query_lower for k in ['average', 'mean', 'avg']):
        target_num = numeric_cols[0] if numeric_cols else (all_numeric[0] if all_numeric else None)
        target_cat = cat_cols[0] if cat_cols else (all_cat[0] if all_cat else None)
        
        if target_num:
            if target_cat:
                grouped = df.groupby(target_cat)[target_num].mean().reset_index()
                top10 = grouped.sort_values(by=target_num, ascending=False).head(10)
                
                table_data = []
                for idx, r in top10.iterrows():
                    table_data.append({
                        target_cat: r[target_cat],
                        f"Average {target_num}": clean_json_value(r[target_num])
                    })
                    
                return {
                    'answer': f"Here is the average '{target_num}' grouped by '{target_cat}' (top 10):",
                    'table': table_data,
                    'chart': {
                        'type': 'bar',
                        'x': target_cat,
                        'y': f"Average {target_num}",
                        'title': f"Average {target_num} by {target_cat}"
                    }
                }
            else:
                avg_val = df[target_num].mean()
                return {
                    'answer': f"The average value of '{target_num}' across the entire dataset is {avg_val:,.2f}.",
                    'table': None,
                    'chart': None
                }
                
    # 6. Trend query
    if any(k in query_lower for k in ['trend', 'over time', 'forecast', 'change']):
        target_date = date_cols[0] if date_cols else (all_date[0] if all_date else None)
        target_num = numeric_cols[0] if numeric_cols else (all_numeric[0] if all_numeric else None)
        
        if target_date and target_num:
            temp_df = df[[target_date, target_num]].copy()
            temp_df[target_date] = pd.to_datetime(temp_df[target_date], errors='coerce')
            temp_df.dropna(inplace=True)
            
            grouped = temp_df.groupby(target_date)[target_num].sum().reset_index()
            grouped.sort_values(by=target_date, inplace=True)
            
            table_data = []
            for idx, r in grouped.head(15).iterrows():
                table_data.append({
                    'Date': r[target_date].strftime('%Y-%m-%d'),
                    target_num: clean_json_value(r[target_num])
                })
                
            return {
                'answer': f"Analyzed trend of '{target_num}' over time based on '{target_date}'.",
                'table': table_data,
                'chart': {
                    'type': 'line',
                    'x': target_date,
                    'y': target_num,
                    'title': f"{target_num} Trend over {target_date}"
                }
            }
            
    # Metadata: List Columns
    if any(k in query_lower for k in ['what columns', 'what are the columns', 'list columns', 'column names', 'columns names', 'column list', 'get columns', 'name of columns', 'columns list', 'dataset columns']):
        col_list = "\n".join([f"- **{col}** ({col_types.get(col, 'unknown')})" for col in columns])
        return {
            'answer': f"The dataset contains these columns:\n{col_list}",
            'table': None,
            'chart': None
        }

    # Metadata: Columns Count
    if any(k in query_lower for k in ['how many columns', 'column count', 'number of columns', 'total columns']):
        return {
            'answer': f"The dataset contains {len(columns)} columns.",
            'table': None,
            'chart': None
        }

    # 7. Search/Find query (specific values or columns)
    # Extract search terms and perform checks on column names and values
    search_keywords = ['search', 'find', 'show', 'where is', 'contains', 'containing', 'is there', 'does the dataset have', 'does it have']
    is_search_intent = any(k in query_lower for k in search_keywords) or 'column' in query_lower
    
    if is_search_intent:
        stopwords = {'is', 'there', 'any', 'column', 'columns', 'with', 'name', 'named', 'called', 'in', 'the', 'dataset', 'of', 'for', 'a', 'an', 'to', 'show', 'find', 'search', 'does', 'have', 'has', 'row', 'rows', 'record', 'records', 'value', 'values'}
        query_words = [re.sub(r'[^a-zA-Z0-9]', '', w) for w in query_lower.split()]
        query_words = [w for w in query_words if w and w not in stopwords]
        
        if query_words:
            search_term = " ".join(query_words)
            # A. Check if any column name matches the term
            matched_cols_name = []
            for col in columns:
                if search_term == col.lower() or (len(search_term) > 2 and search_term in col.lower()):
                    matched_cols_name.append(col)
            
            if matched_cols_name:
                col_list_str = ", ".join([f"**{c}**" for c in matched_cols_name])
                return {
                    'answer': f"Yes, I found matching column(s) in the dataset: {col_list_str}.",
                    'table': [{'Column Name': c, 'Data Type': col_types.get(c, 'unknown')} for c in matched_cols_name],
                    'chart': None
                }
                
            # B. Check if the search term exists as a value in the dataset
            # Scan first 50,000 rows
            search_df = df.head(50000)
            found_rows = []
            found_cols = set()
            
            for col in columns:
                col_type = col_types.get(col, '')
                try:
                    if col_type in ['categorical', 'text']:
                        # case insensitive string search
                        matches = search_df[search_df[col].astype(str).str.lower().str.contains(search_term, na=False, regex=False)]
                    elif col_type == 'numeric':
                        try:
                            val = float(search_term)
                            matches = search_df[search_df[col] == val]
                        except ValueError:
                            continue
                    else:
                        continue
                    
                    if not matches.empty:
                        found_cols.add(col)
                        for _, row in matches.head(5).iterrows():
                            row_dict = row.to_dict()
                            cleaned_row = {k: clean_json_value(v) for k, v in row_dict.items()}
                            cleaned_row['_matched_column'] = col
                            found_rows.append(cleaned_row)
                except Exception:
                    pass
            
            if found_rows:
                found_cols_str = ", ".join([f"**{c}**" for c in found_cols])
                return {
                    'answer': f"I scanned the columns. No column is named '{search_term}', but I found matching values in the following column(s): {found_cols_str}. Showing matching records:",
                    'table': found_rows[:10],
                    'chart': None
                }
            else:
                return {
                    'answer': f"I scanned the dataset's columns and values for '{search_term}'.\n- No column name matches '{search_term}'.\n- No values containing '{search_term}' were found in the dataset's text or categorical columns.\n\nThe dataset columns are: {', '.join(columns)}.",
                    'table': None,
                    'chart': None
                }

    # General Default Answer
    return {
        'answer': f"I scanned the dataset. It has {len(df):,} rows and {len(columns)} columns: {', '.join(columns)}.\n\nHere are some things you can ask me:\n- 'Describe the dataset'\n- 'Show missing values'\n- 'What are the unique values of {columns[0]}?'\n- 'Show top 10 by {all_numeric[0] if all_numeric else columns[-1]}'\n- 'Find rows where {columns[0]} is X'",
        'table': None,
        'chart': None
    }

@query_bp.route('/chat', methods=['POST'])
@login_required
def chat_with_data():
    data = request.get_json() or {}
    dataset_id = data.get('dataset_id')
    query = data.get('query')
    
    if not dataset_id or not query:
        return jsonify({'error': 'dataset_id and query are required'}), 400
        
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    try:
        # Load dataset
        if dataset.filepath.endswith('.csv'):
            df = pd.read_csv(dataset.filepath)
        else:
            df = pd.read_excel(dataset.filepath)
            
        columns = list(df.columns)
        meta = dataset.get_metadata()
        col_types = {col: item['type'] for col, item in meta.get('columns', {}).items()}
        
        # Cast columns to their inferred types to prevent aggregation/math errors
        for col, t in col_types.items():
            if t == 'numeric':
                df[col] = pd.to_numeric(df[col], errors='coerce')
            elif t == 'date':
                df[col] = pd.to_datetime(df[col], errors='coerce')
                
        # Run offline local query engine directly
        local_res = local_fallback_query(df, query, columns, col_types, api_key_configured=False)
        return jsonify(local_res), 200
            
    except Exception as e:
        return jsonify({'error': f'Query execution failed: {str(e)}'}), 500
