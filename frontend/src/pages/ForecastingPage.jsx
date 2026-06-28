import React, { useState, useEffect } from 'react';
import { useDataset } from '../context/DatasetContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../utils/api';
import PlotlyChart from '../components/PlotlyChart';
import GlassCard from '../components/GlassCard';
import { LineChart, Calendar, HelpCircle, Loader2, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';

const ForecastingPage = () => {
  const { selectedDataset } = useDataset();
  const { theme } = useTheme();

  const [dateCols, setDateCols] = useState([]);
  const [numCols, setNumCols] = useState([]);
  const [selectedDateCol, setSelectedDateCol] = useState('');
  const [selectedNumCol, setSelectedNumCol] = useState('');
  const [periods, setPeriods] = useState(30);

  const [forecastResult, setForecastResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract columns matching date/numeric datatypes
  useEffect(() => {
    if (selectedDataset && selectedDataset.metadata) {
      const columns = selectedDataset.metadata.columns || {};
      const dates = Object.keys(columns).filter(c => columns[c].type === 'date');
      const numerics = Object.keys(columns).filter(c => columns[c].type === 'numeric');

      setDateCols(dates);
      setNumCols(numerics);

      if (dates.length > 0) setSelectedDateCol(dates[0]);
      if (numerics.length > 0) setSelectedNumCol(numerics[0]);
      
      setForecastResult(null);
      setError('');
    }
  }, [selectedDataset]);

  const handleForecast = async () => {
    if (!selectedDateCol || !selectedNumCol || !selectedDataset) {
      setError('Please select both a date column and a numeric value column.');
      return;
    }
    setError('');
    setLoading(true);
    setForecastResult(null);

    try {
      const res = await apiFetch(`/forecast/${selectedDataset.id}`, {
        method: 'POST',
        body: JSON.stringify({
          date_column: selectedDateCol,
          value_column: selectedNumCol,
          periods: parseInt(periods)
        })
      });
      setForecastResult(res);
    } catch (err) {
      setError(err.message || 'Forecasting calculation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedDataset) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500">
        <LineChart className="h-10 w-10 text-slate-600 mb-3 animate-float" />
        <p className="text-sm font-semibold">Select a dataset first to perform time-series forecasting</p>
      </div>
    );
  }

  // Build Plotly data for the forecast plot (incorporating bounds)
  const getForecastChartData = () => {
    if (!forecastResult) return [];

    const histX = forecastResult.historical.map(h => h.date);
    const histY = forecastResult.historical.map(h => h.value);

    const foreX = forecastResult.forecast.map(f => f.date);
    const foreY = forecastResult.forecast.map(f => f.value);
    
    // Bounds for shaded region
    const upperY = forecastResult.forecast.map(f => f.upper_bound);
    const lowerY = forecastResult.forecast.map(f => f.lower_bound);

    const traces = [
      // 1. Historical Trace
      {
        x: histX,
        y: histY,
        name: 'Historical',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#6366f1', width: 2 }
      },
      // 2. Confidence Interval Bounds Shading
      {
        x: [...foreX, ...[...foreX].reverse()],
        y: [...upperY, ...[...lowerY].reverse()],
        fill: 'toself',
        fillcolor: theme !== 'midnight' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.12)',
        line: { color: 'transparent' },
        name: '95% Confidence Interval',
        hoverinfo: 'none',
        showlegend: true
      },
      // 3. Forecast Trace
      {
        x: foreX,
        y: foreY,
        name: 'Forecast',
        type: 'scatter',
        mode: 'lines',
        line: { color: '#ec4899', width: 2, dash: 'dash' }
      }
    ];

    return traces;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white m-0">Time Series Forecasting</h1>
        <p className="text-xs text-slate-500 mt-1">
          Predict future trends and project numerical columns based on dates
        </p>
      </div>

      {dateCols.length === 0 ? (
        <GlassCard className="text-center py-12 text-slate-500 text-sm">
          No date/datetime columns detected in this dataset. Forecasting requires at least one date column.
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-6 w-full">
          {/* Settings Column */}
          <div className="w-full">
            <GlassCard className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 tracking-wide uppercase mb-2">Configure Forecast</h3>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Date Column
                </label>
                <select
                  value={selectedDateCol}
                  onChange={(e) => setSelectedDateCol(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {dateCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Value Column (To Predict)
                </label>
                <select
                  value={selectedNumCol}
                  onChange={(e) => setSelectedNumCol(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {numCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Forecast Steps ({periods})
                </label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={periods}
                  onChange={(e) => setPeriods(e.target.value)}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>5 steps</span>
                  <span>120 steps</span>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] flex items-center gap-1.5">
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleForecast}
                disabled={loading || dateCols.length === 0 || numCols.length === 0}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-850 disabled:text-slate-600 text-white font-semibold py-2.5 rounded-xl text-xs transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Analyzing series...</span>
                  </>
                ) : (
                  <span>Project Trend</span>
                )}
              </button>
            </GlassCard>
          </div>

          {/* Visualization Column */}
          <div className="w-full space-y-6">
            {loading ? (
              <div className="h-96 flex flex-col items-center justify-center glass-panel rounded-2xl border border-glass">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                <span className="text-xs text-slate-400">Processing exponential smoothing matrices...</span>
              </div>
            ) : forecastResult ? (
              <div className="space-y-6">
                {/* Chart Card */}
                <GlassCard>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                    Forecast Timeline: {selectedNumCol} over {selectedDateCol}
                  </h3>
                  <PlotlyChart
                    data={getForecastChartData()}
                    layout={{
                      xaxis: { title: selectedDateCol },
                      yaxis: { title: selectedNumCol },
                      showlegend: true,
                      height: 600
                    }}
                    className="h-[620px]"
                  />
                </GlassCard>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <GlassCard className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">Model Employed</p>
                      <h4 className="text-sm font-bold text-slate-200 mt-0.5">{forecastResult.summary.model_used}</h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Resampled at: {forecastResult.summary.frequency_detected}</p>
                    </div>
                  </GlassCard>

                  <GlassCard className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${
                      (forecastResult.summary.projected_growth_percent || 0) >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {(forecastResult.summary.projected_growth_percent || 0) >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">Projected Growth</p>
                      <h4 className="text-sm font-bold text-slate-200 mt-0.5">
                        {typeof forecastResult.summary.projected_growth_percent === 'number' && !isNaN(forecastResult.summary.projected_growth_percent) && isFinite(forecastResult.summary.projected_growth_percent)
                          ? `${forecastResult.summary.projected_growth_percent.toFixed(1)}%`
                          : '0.0%'}
                      </h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Over next {periods} steps</p>
                    </div>
                  </GlassCard>

                  <GlassCard className="flex items-center gap-4">
                    <div className="p-2.5 bg-purple-500/10 rounded-xl text-purple-400">
                      <LineChart className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-medium">Historical Growth</p>
                      <h4 className="text-sm font-bold text-slate-200 mt-0.5">
                        {typeof forecastResult.summary.historical_growth_percent === 'number' && !isNaN(forecastResult.summary.historical_growth_percent) && isFinite(forecastResult.summary.historical_growth_percent)
                          ? `${forecastResult.summary.historical_growth_percent.toFixed(1)}%`
                          : '0.0%'}
                      </h4>
                      <p className="text-[9px] text-slate-500 mt-0.5">Trend Direction: {forecastResult.summary.trend_direction}</p>
                    </div>
                  </GlassCard>
                </div>
              </div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center border border-dashed border-slate-800/60 rounded-2xl text-slate-500">
                <LineChart className="h-10 w-10 text-slate-600 mb-3 animate-float" />
                <p className="text-sm font-semibold">Ready to model series</p>
                <p className="text-xs text-slate-600 mt-1">Configure parameters on the left and run analysis.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ForecastingPage;
