import pandas as pd
import numpy as np
from flask import Blueprint, request, jsonify, g
from database import db
from models import Dataset
from auth import login_required
from statsmodels.tsa.holtwinters import ExponentialSmoothing

forecast_bp = Blueprint('forecast', __name__)

def parse_date_column(series):
    # Try parsing directly
    parsed = pd.to_datetime(series, errors='coerce')
    
    # Check if a high percentage is NaT, or if integers got parsed as unix nanoseconds on 1970-01-01
    non_null_count = series.dropna().count()
    if non_null_count > 0:
        is_high_nat = (parsed.isna().sum() / len(series)) > 0.5
        
        # Check if they all parsed as year 1970 (unix epoch nanosecond issue)
        is_epoch_parse = False
        try:
            valid_dates = parsed.dropna()
            if not valid_dates.empty and valid_dates.min().year == 1970 and valid_dates.max().year == 1970:
                contains_1970 = series.dropna().astype(str).str.contains('1970').any()
                if not contains_1970:
                    is_epoch_parse = True
        except Exception:
            pass
            
        if is_high_nat or is_epoch_parse:
            is_valid_year = False
            try:
                numeric_series = pd.to_numeric(series, errors='coerce')
                valid_years = numeric_series[(numeric_series >= 1700) & (numeric_series <= 2200)]
                if len(valid_years) / non_null_count > 0.5:
                    str_years = valid_years.astype(int).astype(str) + '-01-01'
                    parsed = pd.to_datetime(str_years, errors='coerce')
                    is_valid_year = True
            except Exception:
                pass
                
            if is_epoch_parse and not is_valid_year:
                parsed = pd.Series(pd.NaT, index=series.index)
                
    return parsed

@forecast_bp.route('/<int:dataset_id>', methods=['POST'])
@login_required
def forecast_dataset(dataset_id):
    dataset = Dataset.query.filter_by(id=dataset_id, user_id=g.user.id).first()
    if not dataset:
        return jsonify({'error': 'Dataset not found'}), 404
        
    data = request.get_json() or {}
    date_col = data.get('date_column')
    value_col = data.get('value_column')
    forecast_periods = int(data.get('periods', 30))  # number of steps to forecast
    
    if not date_col or not value_col:
        return jsonify({'error': 'date_column and value_column are required'}), 400
        
    try:
        if dataset.filepath.endswith('.csv'):
            df = pd.read_csv(dataset.filepath)
        else:
            df = pd.read_excel(dataset.filepath)
            
        if date_col not in df.columns or value_col not in df.columns:
            return jsonify({'error': 'Specified columns do not exist in dataset'}), 400
            
        # Prepare series
        temp_df = df[[date_col, value_col]].copy()
        
        parsed_dates = parse_date_column(temp_df[date_col])
        if len(parsed_dates) > 0 and parsed_dates.isna().sum() / len(parsed_dates) > 0.8:
            return jsonify({'error': f"The column '{date_col}' does not appear to contain valid dates. Please select a valid date column."}), 400
            
        temp_df[date_col] = parsed_dates
        temp_df[value_col] = pd.to_numeric(temp_df[value_col], errors='coerce')
        
        if len(temp_df) > 0 and temp_df[value_col].isna().sum() / len(temp_df) > 0.8:
            return jsonify({'error': f"The column '{value_col}' does not appear to contain numeric values. Please select a valid numeric column."}), 400
            
        temp_df.dropna(subset=[date_col, value_col], inplace=True)
        
        if len(temp_df) < 5:
            return jsonify({'error': 'Not enough data points to forecast (minimum 5 required)'}), 400
            
        # Group by date to handle duplicate timestamps
        grouped = temp_df.groupby(date_col)[value_col].sum().sort_index()
        
        # Detect frequency (daily, weekly, monthly, yearly)
        # If irregular, resample to daily and fill missing values
        inferred_freq = pd.infer_freq(grouped.index)
        
        if not inferred_freq:
            # Check average gap
            diffs = pd.Series(grouped.index).diff().dropna()
            avg_days = diffs.dt.days.mean()
            if avg_days <= 1.5:
                freq = 'D'
            elif avg_days <= 8:
                freq = 'W'
            elif avg_days <= 32:
                freq = 'ME'
            else:
                freq = 'YE'
            grouped = grouped.resample(freq).mean().interpolate(method='linear')
        else:
            freq = inferred_freq
            
        # Prepare historical data list
        historical_data = []
        for d, val in grouped.items():
            historical_data.append({
                'date': d.strftime('%Y-%m-%d'),
                'value': float(val) if not np.isnan(val) else None
            })
            
        # Run forecasting model
        forecast_dates = []
        forecast_values = []
        lower_bounds = []
        upper_bounds = []
        
        # We try Exponential Smoothing, if it fails, fallback to simple linear trend regression
        model_type = "Holt Exponential Smoothing"
        try:
            # We use Holt Winters linear trend
            # Check length: if len < 10, Holt Winters might be unstable, fallback to linear
            if len(grouped) >= 10:
                model = ExponentialSmoothing(grouped, trend='add', seasonal=None, initialization_method="estimated")
                fit_model = model.fit()
                pred = fit_model.forecast(forecast_periods)
                
                # Confidence intervals (standard deviation of residuals)
                residuals = fit_model.resid
                std_resid = residuals.std()
                
                for idx, (d, val) in enumerate(pred.items()):
                    # Simple interval estimate
                    dev = 1.96 * std_resid * np.sqrt(idx + 1)  # error propagates with sqrt of step
                    forecast_dates.append(d)
                    forecast_values.append(float(val))
                    lower_bounds.append(float(max(0, val - dev)))
                    upper_bounds.append(float(val + dev))
            else:
                raise ValueError("Too few points for Exponential Smoothing")
                
        except Exception:
            # Fallback: Linear Regression Trend
            model_type = "Linear Regression Trend Line"
            x = np.arange(len(grouped))
            y = grouped.values
            
            # Remove any NaNs in y
            valid = ~np.isnan(y)
            x = x[valid]
            y = y[valid]
            
            if len(y) >= 2:
                slope, intercept = np.polyfit(x, y, 1)
                
                # Standard error of regression
                y_pred_hist = slope * x + intercept
                std_err = np.sqrt(np.sum((y - y_pred_hist) ** 2) / (len(y) - 2)) if len(y) > 2 else y.std()
                
                # Generate future steps
                last_date = grouped.index[-1]
                # Find timedelta based on frequency
                delta = pd.Timedelta(days=1)
                if 'W' in str(freq):
                    delta = pd.Timedelta(weeks=1)
                elif 'M' in str(freq):
                    delta = pd.Timedelta(days=30)
                elif 'Y' in str(freq):
                    delta = pd.Timedelta(days=365)
                    
                for i in range(1, forecast_periods + 1):
                    fut_date = last_date + (delta * i)
                    fut_idx = len(grouped) + i - 1
                    val = slope * fut_idx + intercept
                    dev = 1.96 * std_err * np.sqrt(i)
                    
                    forecast_dates.append(fut_date)
                    forecast_values.append(float(val))
                    lower_bounds.append(float(max(0, val - dev)))
                    upper_bounds.append(float(val + dev))
            else:
                return jsonify({'error': 'Insufficient valid data for linear forecasting.'}), 400
                
        # Format forecasted results
        forecasted_data = []
        for i in range(len(forecast_dates)):
            forecasted_data.append({
                'date': forecast_dates[i].strftime('%Y-%m-%d'),
                'value': forecast_values[i],
                'lower_bound': lower_bounds[i],
                'upper_bound': upper_bounds[i]
            })
            
        # Growth summary
        start_hist = grouped.iloc[0]
        end_hist = grouped.iloc[-1]
        hist_growth = ((end_hist - start_hist) / start_hist * 100) if start_hist != 0 else 0
        
        proj_growth = ((forecast_values[-1] - end_hist) / end_hist * 100) if end_hist != 0 else 0
        
        summary = {
            'model_used': model_type,
            'historical_growth_percent': float(hist_growth),
            'projected_growth_percent': float(proj_growth),
            'trend_direction': 'Upward' if proj_growth > 2 else ('Downward' if proj_growth < -2 else 'Stable'),
            'frequency_detected': str(freq)
        }
        
        return jsonify({
            'historical': historical_data,
            'forecast': forecasted_data,
            'summary': summary
        }), 200
        
    except Exception as e:
        return jsonify({'error': f'Forecasting failed: {str(e)}'}), 500
