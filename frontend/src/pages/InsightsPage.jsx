import React, { useState, useEffect } from 'react';
import { useDataset } from '../context/DatasetContext';
import { useTheme } from '../context/ThemeContext';
import { apiFetch } from '../utils/api';
import PlotlyChart from '../components/PlotlyChart';
import GlassCard from '../components/GlassCard';
import { Sparkles, TrendingUp, Grid, ShieldAlert, BarChart3, Loader2, GitCommit } from 'lucide-react';

const InsightsPage = () => {
  const { selectedDataset, previewData } = useDataset();
  const { theme } = useTheme();
  
  const [activeSubTab, setActiveSubTab] = useState('discoveries'); // 'discoveries', 'clustering', 'cohort'
  
  // General Insights State
  const [insightsData, setInsightsData] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // Clustering State
  const [numericCols, setNumericCols] = useState([]);
  const [selectedClusterCols, setSelectedClusterCols] = useState([]);
  const [kClusters, setKClusters] = useState(3);
  const [clusteringResult, setClusteringResult] = useState(null);
  const [loadingClustering, setLoadingClustering] = useState(false);
  const [clusterError, setClusterError] = useState('');

  // Cohort State
  const [dateCols, setDateCols] = useState([]);
  const [allCols, setAllCols] = useState([]);
  const [cohortUserCol, setCohortUserCol] = useState('');
  const [cohortDateCol, setCohortDateCol] = useState('');
  const [cohortResult, setCohortResult] = useState(null);
  const [loadingCohort, setLoadingCohort] = useState(false);
  const [cohortError, setCohortError] = useState('');

  // Load fields and general insights
  useEffect(() => {
    if (selectedDataset && selectedDataset.metadata) {
      const columns = selectedDataset.metadata.columns || {};
      const numerics = Object.keys(columns).filter(c => columns[c].type === 'numeric');
      const dates = Object.keys(columns).filter(c => columns[c].type === 'date');
      
      setNumericCols(numerics);
      setDateCols(dates);
      setAllCols(Object.keys(columns));

      // Preset selections
      if (numerics.length >= 2) {
        setSelectedClusterCols([numerics[0], numerics[1]]);
      } else {
        setSelectedClusterCols(numerics);
      }
      
      const textOrCat = Object.keys(columns).filter(c => columns[c].type === 'categorical' || columns[c].type === 'text');
      if (textOrCat.length > 0) setCohortUserCol(textOrCat[0]);
      else if (Object.keys(columns).length > 0) setCohortUserCol(Object.keys(columns)[0]);
      
      if (dates.length > 0) setCohortDateCol(dates[0]);

      // Reset states
      setInsightsData(null);
      setClusteringResult(null);
      setCohortResult(null);
      
      // Auto fetch general insights
      fetchInsights();
    }
  }, [selectedDataset]);

  const fetchInsights = async () => {
    if (!selectedDataset) return;
    setLoadingInsights(true);
    try {
      const res = await apiFetch(`/insights/${selectedDataset.id}`);
      setInsightsData(res);
    } catch (err) {
      console.error('Failed to load insights:', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  const handleRunClustering = async () => {
    if (selectedClusterCols.length < 2) {
      setClusterError('Select at least 2 numerical columns.');
      return;
    }
    setClusterError('');
    setLoadingClustering(true);
    setClusteringResult(null);
    try {
      const res = await apiFetch(`/advanced/${selectedDataset.id}/cluster`, {
        method: 'POST',
        body: JSON.stringify({
          columns: selectedClusterCols,
          k: parseInt(kClusters)
        })
      });
      setClusteringResult(res);
    } catch (err) {
      setClusterError(err.message || 'Clustering execution failed.');
    } finally {
      setLoadingClustering(false);
    }
  };

  const handleRunCohort = async () => {
    if (!cohortUserCol || !cohortDateCol) {
      setCohortError('Select user and date columns.');
      return;
    }
    setCohortError('');
    setLoadingCohort(true);
    setCohortResult(null);
    try {
      const res = await apiFetch(`/advanced/${selectedDataset.id}/cohort`, {
        method: 'POST',
        body: JSON.stringify({
          user_column: cohortUserCol,
          date_column: cohortDateCol
        })
      });
      setCohortResult(res);
    } catch (err) {
      setCohortError(err.message || 'Cohort generation failed.');
    } finally {
      setLoadingCohort(false);
    }
  };

  const toggleClusterCol = (col) => {
    setSelectedClusterCols(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  if (!selectedDataset) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500">
        <TrendingUp className="h-10 w-10 text-slate-600 mb-3 animate-float" />
        <p className="text-sm font-semibold">Select a dataset first to see insights and advanced models</p>
      </div>
    );
  }

  // Visual helper for recommended general insight charts
  const renderInsightChart = (rec) => {
    if (!rec || !previewData || !previewData.data) return null;
    const records = previewData.data;

    let chartData = [];
    let layout = { height: 600 };

    if (rec.type === 'bar') {
      chartData = [{
        x: records.map(r => r[rec.x]),
        y: records.map(r => r[rec.y]),
        type: 'bar',
        text: records.map(r => typeof r[rec.y] === 'number' ? r[rec.y].toFixed(1) : r[rec.y]),
        textposition: 'outside',
        marker: { color: 'rgba(99, 102, 241, 0.7)' }
      }];
      layout.xaxis = { title: rec.x };
      layout.yaxis = { title: rec.y };
    } else if (rec.type === 'line') {
      const sorted = [...records].sort((a,b) => new Date(a[rec.x]) - new Date(b[rec.x]));
      chartData = [{
        x: sorted.map(r => r[rec.x]),
        y: sorted.map(r => r[rec.y]),
        type: 'scatter',
        mode: 'lines+markers+text',
        text: sorted.map(r => typeof r[rec.y] === 'number' ? r[rec.y].toFixed(1) : r[rec.y]),
        textposition: 'top center',
        line: { color: '#ec4899' }
      }];
      layout.xaxis = { title: rec.x };
      layout.yaxis = { title: rec.y };
    } else if (rec.type === 'scatter') {
      chartData = [{
        x: records.map(r => r[rec.x]),
        y: records.map(r => r[rec.y]),
        type: 'scattergl',
        mode: 'markers+text',
        text: records.map(r => typeof r[rec.y] === 'number' ? r[rec.y].toFixed(1) : r[rec.y]),
        textposition: 'top center',
        marker: { color: '#a855f7' }
      }];
      layout.xaxis = { title: rec.x };
      layout.yaxis = { title: rec.y };
    } else if (rec.type === 'histogram') {
      chartData = [{
        x: records.map(r => r[rec.x]),
        type: 'histogram',
        texttemplate: '%{y}',
        textposition: 'outside',
        marker: { color: 'rgba(59, 130, 246, 0.7)' }
      }];
      layout.xaxis = { title: rec.x };
      layout.yaxis = { title: 'Count' };
    }

    if (chartData.length === 0) return null;

    return (
      <div className="mt-4 p-2 bg-slate-950/20 rounded-xl border border-slate-900/50">
        <PlotlyChart data={chartData} layout={layout} className="h-[620px]" />
      </div>
    );
  };

  // Build clustering Plotly trace
  const getClusteringChartData = () => {
    if (!clusteringResult) return [];
    
    // Group points by cluster
    const traces = [];
    const colors = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
    
    for (let c = 0; c < parseInt(kClusters); c++) {
      const clusterPoints = clusteringResult.points.filter(p => p.cluster === c);
      traces.push({
        x: clusterPoints.map(p => p.pca_x),
        y: clusterPoints.map(p => p.pca_y),
        name: `Cluster ${c}`,
        type: 'scattergl',
        mode: 'markers',
        marker: {
          size: 6,
          color: colors[c % colors.length],
          opacity: 0.8
        },
        text: clusterPoints.map(p => 
          clusteringResult.columns.map(col => `${col}: ${p[col]?.toFixed(1)}`).join('<br>')
        ),
        hoverinfo: 'text+name'
      });
    }
    
    return traces;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Advanced Analytics</h1>
          <p className="text-xs text-slate-500 mt-1">Run complex clustering, user cohorts retention and general dataset discoveries</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveSubTab('discoveries')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'discoveries' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Discoveries
          </button>
          <button
            onClick={() => setActiveSubTab('clustering')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'clustering' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            K-Means Clustering
          </button>
          <button
            onClick={() => setActiveSubTab('cohort')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeSubTab === 'cohort' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cohort Retention
          </button>
        </div>
      </div>

      {/* Sub Tab 1: Auto-Insights */}
      {activeSubTab === 'discoveries' && (
        loadingInsights ? (
          <div className="h-96 flex flex-col items-center justify-center glass-panel rounded-2xl border border-glass">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
            <span className="text-xs text-slate-400">Scanning data variables...</span>
          </div>
        ) : insightsData ? (
          <div className="flex flex-col gap-6 w-full">
            {insightsData.insights.map((insight, idx) => (
              <GlassCard key={idx} className="flex flex-col justify-between w-full">
                <div>
                  <div className="flex justify-between items-start gap-3">
                    <h4 className="font-bold text-xs text-slate-100">{insight.title}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[8px] font-bold uppercase bg-indigo-500/10 text-indigo-400">
                      {insight.strength} strength
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{insight.description}</p>
                </div>
                {insight.chart_recommendation && renderInsightChart(insight.chart_recommendation)}
              </GlassCard>
            ))}
          </div>
        ) : null
      )}

      {/* Sub Tab 2: K-Means Clustering */}
      {activeSubTab === 'clustering' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1">
            <GlassCard className="space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Clustering Parameters</h3>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-2">
                  Select Columns (Min 2)
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {numericCols.map(col => (
                    <div key={col} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`cluster-${col}`}
                        checked={selectedClusterCols.includes(col)}
                        onChange={() => toggleClusterCol(col)}
                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-indigo-600"
                      />
                      <label htmlFor={`cluster-${col}`} className="text-xs text-slate-300 truncate cursor-pointer">
                        {col}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Number of Clusters (k)
                </label>
                <input
                  type="number"
                  min="2"
                  max="5"
                  value={kClusters}
                  onChange={(e) => setKClusters(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              {clusterError && (
                <p className="text-[10px] text-rose-400">{clusterError}</p>
              )}

              <button
                onClick={handleRunClustering}
                disabled={loadingClustering || selectedClusterCols.length < 2}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-850 disabled:text-slate-650 text-white font-semibold py-2 rounded-xl text-xs transition-colors"
              >
                {loadingClustering ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <span>Run K-Means</span>}
              </button>
            </GlassCard>
          </div>

          {/* Visualization */}
          <div className="lg:col-span-3 space-y-6">
            {loadingClustering ? (
              <div className="h-96 flex flex-col items-center justify-center border border-slate-800/80 rounded-2xl">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
                <span className="text-xs text-slate-400">Fitting centroids and computing eigenvalues...</span>
              </div>
            ) : clusteringResult ? (
              <div className="space-y-6">
                <GlassCard>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xs font-bold text-slate-350 uppercase">2D Cluster PCA Scatter Projection</h4>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      PCA Explained Variance: {clusteringResult.explained_variance.toFixed(1)}%
                    </span>
                  </div>
                  <PlotlyChart
                    data={getClusteringChartData()}
                    layout={{
                      xaxis: { title: 'Principal Component 1' },
                      yaxis: { title: 'Principal Component 2' }
                    }}
                    className="h-80"
                  />
                </GlassCard>

                {/* Summaries Table */}
                <GlassCard>
                  <h4 className="text-xs font-bold text-slate-350 uppercase mb-4">Cluster Centroids Summary</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className={theme !== 'midnight' ? 'bg-slate-900' : 'bg-slate-100'}>
                          <th className="p-2 border border-slate-800 text-slate-400">Cluster</th>
                          <th className="p-2 border border-slate-800 text-slate-400">Size (Count)</th>
                          <th className="p-2 border border-slate-800 text-slate-400">Percentage</th>
                          {clusteringResult.columns.map(col => (
                            <th key={col} className="p-2 border border-slate-800 text-slate-400 font-bold">{col} (Mean)</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {clusteringResult.summaries.map(sum => (
                          <tr key={sum.cluster_id} className="hover:bg-slate-850/15">
                            <td className="p-2 border border-slate-800 text-slate-200 font-bold">Cluster {sum.cluster_id}</td>
                            <td className="p-2 border border-slate-800 text-slate-300">{sum.count.toLocaleString()}</td>
                            <td className="p-2 border border-slate-800 text-slate-400">{sum.percentage.toFixed(1)}%</td>
                            {clusteringResult.columns.map(col => (
                              <td key={col} className="p-2 border border-slate-800 text-indigo-400">
                                {sum.means[col] !== null ? sum.means[col].toFixed(2) : 'N/A'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GlassCard>
              </div>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                <BarChart3 className="h-8 w-8 text-slate-600 mb-2 animate-float" />
                <span className="text-xs">Configure clustering dimensions and run K-means to display scatter outputs.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub Tab 3: Cohort Retention */}
      {activeSubTab === 'cohort' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1">
            <GlassCard className="space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Cohort Configuration</h3>
              
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Customer ID Column
                </label>
                <select
                  value={cohortUserCol}
                  onChange={(e) => setCohortUserCol(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">-- Select --</option>
                  {allCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Activity Date Column
                </label>
                <select
                  value={cohortDateCol}
                  onChange={(e) => setCohortDateCol(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">-- Select --</option>
                  {dateCols.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>

              {cohortError && (
                <p className="text-[10px] text-rose-400">{cohortError}</p>
              )}

              <button
                onClick={handleRunCohort}
                disabled={loadingCohort || !cohortUserCol || !cohortDateCol}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-850 disabled:text-slate-650 text-white font-semibold py-2 rounded-xl text-xs transition-colors"
              >
                {loadingCohort ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <span>Compile Retention</span>}
              </button>
            </GlassCard>
          </div>

          {/* Retention Matrix Table */}
          <div className="lg:col-span-3 space-y-6">
            {loadingCohort ? (
              <div className="h-96 flex flex-col items-center justify-center border border-slate-800/80 rounded-2xl">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
                <span className="text-xs text-slate-400">Grouping transaction indices by first customer touch month...</span>
              </div>
            ) : cohortResult ? (
              <GlassCard>
                <h4 className="text-xs font-bold text-slate-350 uppercase mb-4">Customer Monthly Retention Matrix (%)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs border-collapse whitespace-nowrap">
                    <thead>
                      <tr className={theme !== 'midnight' ? 'bg-slate-900' : 'bg-slate-100'}>
                        <th className="p-2 border border-slate-800 text-left text-slate-400">Cohort Month</th>
                        <th className="p-2 border border-slate-800 text-slate-400">Users</th>
                        {Array.from({ length: 12 }).map((_, i) => (
                          <th key={i} className="p-2 border border-slate-800 text-slate-400 font-semibold">M{i}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cohortResult.cohort_matrix.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-850/15">
                          <td className="p-2 border border-slate-800 text-left font-bold text-slate-200">{row.cohort}</td>
                          <td className="p-2 border border-slate-800 text-slate-300 font-semibold">{row.total_users}</td>
                          {Array.from({ length: 12 }).map((_, i) => {
                            const match = row.retention.find(r => r.period === i);
                            const val = match ? match.retention_rate * 100 : null;
                            
                            // Color intensity based on retention percentage
                            let bgStyle = {};
                            if (val !== null) {
                              const opacity = val / 100;
                              bgStyle = { 
                                backgroundColor: `rgba(99, 102, 241, ${opacity})`, 
                                color: opacity > 0.45 ? '#fff' : (theme !== 'midnight' ? '#cbd5e1' : '#1e293b') 
                              };
                            }
                            
                            return (
                              <td key={i} style={bgStyle} className="p-2 border border-slate-800">
                                {val !== null ? `${val.toFixed(0)}%` : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            ) : (
              <div className="h-96 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl text-slate-500">
                <GitCommit className="h-8 w-8 text-slate-600 mb-2 animate-float" />
                <span className="text-xs">Configure User ID and Activity Dates to compile monthly cohort retention.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
