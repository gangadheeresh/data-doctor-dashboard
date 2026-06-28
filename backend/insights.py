import pandas as pd
import numpy as np
from flask import Blueprint, jsonify, g
from database import db
from models import Dataset
from auth import login_required
from datasets import infer_column_types

insights_bp = Blueprint('insights', __name__)

def detect_skewness_insights(df, numeric_cols):
    insights = []
    for col in numeric_cols:
        series = pd.to_numeric(df[col], errors='coerce').dropna()
        if len(series) > 10:
            skew = series.skew()
            if abs(skew) > 1.5:
                direction = "right (positive skew)" if skew > 0 else "left (negative skew)"
                insights.append({
                    'type': 'distribution',
                    'title': f"Highly Skewed Distribution in '{col}'",
                    'description': f"The values in column '{col}' are highly skewed to the {direction} (skewness coefficient: {skew:.2f}). Most values are clustered on one side, which is typical for metrics like income, transaction sizes, or counts.",
                    'strength': 'high' if abs(skew) > 2.5 else 'medium',
                    'chart_recommendation': {
                        'type': 'histogram',
                        'x': col,
                        'title': f"Distribution of {col}"
                    }
                })
    return insights

def detect_correlation_insights(df, numeric_cols):
    insights = []
    if len(numeric_cols) < 2:
        return insights
        
    # Calculate correlation matrix
    corr_df = df[numeric_cols].corr()
    
    # Extract pairs
    pairs = []
    for i in range(len(numeric_cols)):
        for j in range(i + 1, len(numeric_cols)):
            col1 = numeric_cols[i]
            col2 = numeric_cols[j]
            r = corr_df.loc[col1, col2]
            if not np.isnan(r) and abs(r) > 0.4:
                pairs.append((col1, col2, r))
                
    # Sort by strength
    pairs.sort(key=lambda x: abs(x[2]), reverse=True)
    
    # Take top 5 correlations
    for col1, col2, r in pairs[:5]:
        direction = "positive" if r > 0 else "negative"
        strength = "strong" if abs(r) > 0.7 else "moderate"
        insights.append({
            'type': 'correlation',
            'title': f"{strength.capitalize()} {direction} correlation between '{col1}' and '{col2}'",
            'description': f"Column '{col1}' and column '{col2}' show a {strength} {direction} linear relationship with a correlation coefficient of {r:.2f}. Changes in '{col1}' are highly associated with changes in '{col2}'.",
            'strength': 'high' if abs(r) > 0.7 else 'medium',
            'chart_recommendation': {
                'type': 'scatter',
                'x': col1,
                'y': col2,
                'title': f"{col1} vs {col2} Correlation (r={r:.2f})"
            }
        })
        
    # Add correlation heatmap recommendation if there are at least 3 numeric columns
    if len(numeric_cols) >= 3:
        insights.append({
            'type': 'correlation_matrix',
            'title': "Overall Correlation Heatmap",
            'description': "A correlation heatmap showing relationships between all numeric variables in the dataset. Useful for identifying multi-collinearity or grouping similar variables.",
            'strength': 'medium',
            'chart_recommendation': {
                'type': 'heatmap',
                'columns': numeric_cols,
                'title': "Correlation Heatmap"
            }
        })
        
    return insights

def detect_categorical_insights(df, cat_cols, numeric_cols):
    insights = []
    if not cat_cols or not numeric_cols:
        return insights
        
    # Pick top numeric columns (e.g., based on standard deviation or variance, or first 2)
    target_numerics = numeric_cols[:2]
    
    for cat in cat_cols[:2]:
        # Clean category
        non_null_cat = df[cat].dropna()
        if len(non_null_cat) == 0:
            continue
            
        unique_vals = non_null_cat.nunique()
        if unique_vals < 2 or unique_vals > 25:
            continue  # ignore high or low cardinality
            
        for num in target_numerics:
            # Group by and aggregate
            grouped = df.groupby(cat)[num].agg(['sum', 'mean', 'count']).reset_index()
            # Sort by sum
            grouped_sum = grouped.sort_values(by='sum', ascending=False)
            
            if len(grouped_sum) > 0:
                top_cat = grouped_sum.iloc[0][cat]
                top_val_sum = grouped_sum.iloc[0]['sum']
                total_sum = df[num].sum()
                
                percentage = (top_val_sum / total_sum * 100) if total_sum > 0 else 0
                
                if percentage > 25 and grouped_sum.iloc[0]['count'] > 2:
                    insights.append({
                        'type': 'categorical_performance',
                        'title': f"Dominant '{cat}' category in total '{num}'",
                        'description': f"Category '{top_cat}' in column '{cat}' accounts for {percentage:.1f}% of the total sum of '{num}' ({top_val_sum:,.2f} out of {total_sum:,.2f}).",
                        'strength': 'high' if percentage > 50 else 'medium',
                        'chart_recommendation': {
                            'type': 'bar',
                            'x': cat,
                            'y': num,
                            'title': f"Total {num} by {cat}"
                        }
                    })
                    
            # Sort by mean
            grouped_mean = grouped.sort_values(by='mean', ascending=False)
            if len(grouped_mean) > 1:
                highest_cat = grouped_mean.iloc[0][cat]
                highest_avg = grouped_mean.iloc[0]['mean']
                lowest_cat = grouped_mean.iloc[-1][cat]
                lowest_avg = grouped_mean.iloc[-1]['mean']
                
                ratio = highest_avg / lowest_avg if lowest_avg > 0 else 0
                if ratio > 1.5 and grouped_mean.iloc[0]['count'] > 2:
                    insights.append({
                        'type': 'categorical_performance',
                        'title': f"Significant performance gap in '{num}' across '{cat}'",
                        'description': f"The average '{num}' for '{highest_cat}' ({highest_avg:,.2f}) is {ratio:.1f}x higher than that of '{lowest_cat}' ({lowest_avg:,.2f}).",
                        'strength': 'high' if ratio > 3 else 'medium',
                        'chart_recommendation': {
                            'type': 'bar',
                            'x': cat,
                            'y': num,
                            'title': f"Average {num} by {cat}"
                        }
                    })
    return insights

def detect_time_series_insights(df, date_cols, numeric_cols):
    insights = []
    if not date_cols or not numeric_cols:
        return insights
        
    date_col = date_cols[0]
    num_col = numeric_cols[0]
    
    try:
        # Create temporary df with datetime index
        temp_df = df[[date_col, num_col]].copy()
        temp_df[date_col] = pd.to_datetime(temp_df[date_col], errors='coerce')
        temp_df.dropna(subset=[date_col, num_col], inplace=True)
        
        if len(temp_df) < 15:
            return insights
            
        temp_df.sort_values(by=date_col, inplace=True)
        
        # Aggregate by month or date to find trend
        # We can map datetime to ordinal numbers and run linear regression
        temp_df['ordinal'] = temp_df[date_col].apply(lambda x: x.toordinal())
        
        # Fit line: y = mx + c
        m, c = np.polyfit(temp_df['ordinal'], temp_df[num_col], 1)
        
        start_val = m * temp_df['ordinal'].iloc[0] + c
        end_val = m * temp_df['ordinal'].iloc[-1] + c
        
        pct_change = ((end_val - start_val) / start_val * 100) if start_val != 0 else 0
        
        if abs(pct_change) > 10:
            direction = "upward growth trend" if pct_change > 0 else "downward decline trend"
            insights.append({
                'type': 'trend',
                'title': f"Overall {direction} in '{num_col}' over time",
                'description': f"An analysis of '{num_col}' over the dates in '{date_col}' shows an estimated {direction} of {abs(pct_change):.1f}% from the beginning to the end of the period.",
                'strength': 'high' if abs(pct_change) > 30 else 'medium',
                'chart_recommendation': {
                    'type': 'line',
                    'x': date_col,
                    'y': num_col,
                    'title': f"{num_col} Trend over Time"
                }
            })
            
        # Seasonality by Day of Week
        temp_df['day_of_week'] = temp_df[date_col].dt.day_name()
        dow_avg = temp_df.groupby('day_of_week')[num_col].mean().reindex([
            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
        ]).dropna()
        
        if len(dow_avg) == 7:
            max_day = dow_avg.idxmax()
            min_day = dow_avg.idxmin()
            ratio = dow_avg.max() / dow_avg.min() if dow_avg.min() > 0 else 0
            if ratio > 1.25:
                insights.append({
                    'type': 'seasonality',
                    'title': f"Weekly cycle detected for '{num_col}'",
                    'description': f"Values of '{num_col}' show standard weekly patterns. The highest average occurs on {max_day} ({dow_avg.max():,.2f}), which is {ratio:.1f}x higher than the lowest average on {min_day} ({dow_avg.min():,.2f}).",
                    'strength': 'medium',
                    'chart_recommendation': {
                        'type': 'bar',
                        'x': 'day_of_week',
                        'y': num_col,
                        'title': f"Average {num_col} by Day of Week"
                    }
                })
    except Exception:
        pass
        
    return insights

@insights_bp.route('/<int:dataset_id>', methods=['GET'])
@login_required
def generate_insights(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    try:
        if dataset.filepath.endswith('.csv'):
            df = pd.read_csv(dataset.filepath)
        else:
            df = pd.read_excel(dataset.filepath)
            
        # Optimization: Sample dataset if it is too large for fast insights generation
        if len(df) > 15000:
            df = df.sample(n=15000, random_state=42)
            
        # Deduce column classifications
        inferred_types = infer_column_types(df)
        
        numeric_cols = [c for c, t in inferred_types.items() if t == 'numeric']
        cat_cols = [c for c, t in inferred_types.items() if t == 'categorical']
        date_cols = [c for c, t in inferred_types.items() if t == 'date']
        boolean_cols = [c for c, t in inferred_types.items() if t == 'boolean']
        
        # Cast columns to their inferred types in the dataframe to prevent crashes in corr(), groupby().agg(), and polyfit()
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        for col in date_cols:
            df[col] = pd.to_datetime(df[col], errors='coerce')
            
        all_insights = []
        
        # 1. Skewness / Distribution
        all_insights.extend(detect_skewness_insights(df, numeric_cols))
        
        # 2. Correlations
        all_insights.extend(detect_correlation_insights(df, numeric_cols))
        
        # 3. Categorical breakdown
        all_insights.extend(detect_categorical_insights(df, cat_cols, numeric_cols))
        
        # 4. Time series / trends
        all_insights.extend(detect_time_series_insights(df, date_cols, numeric_cols))
        
        # Sort insights by strength (high first)
        strength_map = {'high': 3, 'medium': 2, 'low': 1}
        all_insights.sort(key=lambda x: strength_map.get(x['strength'], 0), reverse=True)
        
        # Add basic KPIs
        summary_kpis = {
            'row_count': dataset.row_count,
            'col_count': dataset.col_count,
            'missing_cells': dataset.get_metadata().get('total_nulls', 0),
            'duplicate_rows': dataset.get_metadata().get('duplicate_count', 0),
            'columns_by_type': {
                'numeric': len(numeric_cols),
                'categorical': len(cat_cols),
                'date': len(date_cols),
                'boolean': len(boolean_cols),
                'text': len(inferred_types) - len(numeric_cols) - len(cat_cols) - len(date_cols) - len(boolean_cols)
            }
        }
        
        return jsonify({
            'kpis': summary_kpis,
            'insights': all_insights
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Failed to generate insights: {str(e)}'}), 500
