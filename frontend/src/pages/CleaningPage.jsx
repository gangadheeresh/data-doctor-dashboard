import React, { useState, useEffect } from 'react';
import { useDataset } from '../context/DatasetContext';
import { useTheme } from '../context/ThemeContext';
import GlassCard from '../components/GlassCard';
import { Wand2, AlertTriangle, Trash2, ShieldCheck, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';

const CleaningPage = () => {
  const { selectedDataset, getCleaningSuggestions, executeClean, loading } = useDataset();
  const { theme } = useTheme();

  const [suggestions, setSuggestions] = useState(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [imputeMissing, setImputeMissing] = useState({}); // col -> strategy
  const [removeOutliers, setRemoveOutliers] = useState({}); // col -> boolean
  const [typeCorrections, setTypeCorrections] = useState({}); // col -> type

  const loadSuggestions = async () => {
    if (!selectedDataset) return;
    setLoadingSuggestions(true);
    setSuccessMsg('');
    try {
      const data = await getCleaningSuggestions(selectedDataset.id);
      setSuggestions(data);
      
      // Reset form controls
      setRemoveDuplicates(data.duplicate_count > 0);
      
      const defaultImputes = {};
      Object.keys(data.missing_values).forEach((col) => {
        defaultImputes[col] = 'drop'; // default to drop rows
      });
      setImputeMissing(defaultImputes);

      const defaultOutliers = {};
      Object.keys(data.outliers).forEach((col) => {
        defaultOutliers[col] = false;
      });
      setRemoveOutliers(defaultOutliers);
      
      setTypeCorrections({});
    } catch (err) {
      console.error('Failed to load cleaning suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    loadSuggestions();
  }, [selectedDataset]);

  const handleClean = async () => {
    if (!selectedDataset) return;
    setSuccessMsg('');
    
    // Filter active impute/outliers inputs
    const activeImputes = {};
    Object.keys(imputeMissing).forEach((col) => {
      if (suggestions.missing_values[col]) {
        activeImputes[col] = imputeMissing[col];
      }
    });

    const activeOutliers = Object.keys(removeOutliers).filter(col => removeOutliers[col]);

    const payload = {
      remove_duplicates: removeDuplicates,
      impute_missing: activeImputes,
      remove_outliers: activeOutliers,
      type_corrections: typeCorrections
    };

    try {
      await executeClean(selectedDataset.id, payload);
      setSuccessMsg('Dataset cleaned successfully and schema updated!');
      // Reload suggestions to check for remaining issues
      loadSuggestions();
    } catch (err) {
      alert(err.message || 'Cleaning execution failed.');
    }
  };

  if (!selectedDataset) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500">
        <Wand2 className="h-10 w-10 text-slate-600 mb-3 animate-float" />
        <p className="text-sm font-semibold">Select a dataset first to review cleaning suggestions</p>
      </div>
    );
  }

  const hasIssues = suggestions && (
    suggestions.duplicate_count > 0 ||
    Object.keys(suggestions.missing_values).length > 0 ||
    Object.keys(suggestions.outliers).length > 0
  );

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Automatic Data Cleaning</h1>
          <p className="text-xs text-slate-500 mt-1">Review statistical anomalies, missing values, duplicates, and apply cleaning in seconds</p>
        </div>
        
        <button
          onClick={handleClean}
          disabled={loading || loadingSuggestions}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-colors shadow-lg hover:shadow-indigo-500/20"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Applying Clean Tools...</span>
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" />
              <span>Run Cleaning Sequence</span>
            </>
          )}
        </button>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center gap-2.5 animate-pulse-glow">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loadingSuggestions ? (
        <div className="h-96 flex flex-col items-center justify-center glass-panel rounded-2xl border border-glass">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
          <span className="text-xs text-slate-400">Scanning dataset values for anomalies...</span>
        </div>
      ) : suggestions ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Duplicates panel */}
            <GlassCard>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">Duplicate Records</h3>
                  <p className="text-xs text-slate-500 mt-1">Strips matching duplicate rows to maintain data integrity.</p>
                </div>
                <div className={`px-2 py-1 rounded text-[10px] font-bold ${suggestions.duplicate_count > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {suggestions.duplicate_count} duplicates found
                </div>
              </div>
              
              {suggestions.duplicate_count > 0 && (
                <div className="mt-4 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    id="remove-dupes"
                    checked={removeDuplicates}
                    onChange={(e) => setRemoveDuplicates(e.target.checked)}
                    className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                  />
                  <label htmlFor="remove-dupes" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Remove all duplicate records automatically
                  </label>
                </div>
              )}
            </GlassCard>

            {/* Missing Values panel */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Missing Values Imputation</h3>
              <p className="text-xs text-slate-500 mb-4">Select columns with missing data and choose the fill strategy.</p>
              
              {Object.keys(suggestions.missing_values).length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs py-2 bg-emerald-500/5 rounded-xl px-3 border border-emerald-500/10">
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>No missing values detected in any columns!</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(suggestions.missing_values).map((col) => {
                    const issue = suggestions.missing_values[col];
                    return (
                      <div key={col} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-200">{col}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {issue.count.toLocaleString()} nulls ({issue.percentage.toFixed(1)}% of rows)
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <label className="text-[10px] text-slate-500 uppercase tracking-wide">Strategy:</label>
                          <select
                            value={imputeMissing[col] || 'drop'}
                            onChange={(e) => setImputeMissing({ ...imputeMissing, [col]: e.target.value })}
                            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="drop">Drop Rows</option>
                            <option value="mode">Fill with Mode (Most Freq)</option>
                            {issue.imputation_strategies.includes('fill_mean') && (
                              <>
                                <option value="mean">Fill with Mean (Average)</option>
                                <option value="median">Fill with Median</option>
                              </>
                            )}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>

            {/* Outliers panel */}
            <GlassCard>
              <h3 className="text-sm font-semibold text-slate-200 mb-2">Outliers Management</h3>
              <p className="text-xs text-slate-500 mb-4">Outliers are computed using the Interquartile Range (IQR) method.</p>
              
              {Object.keys(suggestions.outliers).length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-400 text-xs py-2 bg-emerald-500/5 rounded-xl px-3 border border-emerald-500/10">
                  <ShieldCheck className="h-4.5 w-4.5" />
                  <span>No numerical outliers detected in this dataset!</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.keys(suggestions.outliers).map((col) => {
                    const issue = suggestions.outliers[col];
                    return (
                      <div key={col} className="p-3 bg-slate-900/40 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-200">{col}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {issue.count.toLocaleString()} outliers ({issue.percentage.toFixed(1)}% of rows)
                          </p>
                          <p className="text-[9px] text-slate-600 mt-0.5">
                            Range limits: {issue.lower_bound.toFixed(1)} to {issue.upper_bound.toFixed(1)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`outlier-${col}`}
                            checked={!!removeOutliers[col]}
                            onChange={(e) => setRemoveOutliers({ ...removeOutliers, [col]: e.target.checked })}
                            className="h-4.5 w-4.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0"
                          />
                          <label htmlFor={`outlier-${col}`} className="text-xs text-slate-300 cursor-pointer font-medium">
                            Remove outliers
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Right Column: Recommendations Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <GlassCard className="h-full">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Smart Recommendations</span>
              </h3>
              
              {!hasIssues ? (
                <div className="text-center py-10 space-y-3">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto animate-float" />
                  <p className="text-xs font-semibold text-slate-300">Clean & Ready!</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">Your dataset has zero duplicates, empty fields, or numerical outliers. You can proceed with full forecasting and chat features.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-indigo-400">1. Remove Duplicates first</p>
                    <p className="text-slate-500 leading-relaxed text-[11px]">This prevents double-counting observations in models and group-by calculations.</p>
                  </div>
                  
                  <div className="p-3 bg-purple-500/5 border border-purple-500/10 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-purple-400">2. Mean vs Mode Fill</p>
                    <p className="text-slate-500 leading-relaxed text-[11px]">Use Mean/Median for continuous values (prices, counts) and Mode for categorical fields (countries, statuses).</p>
                  </div>

                  <div className="p-3 bg-pink-500/5 border border-pink-500/10 rounded-xl text-xs space-y-2">
                    <p className="font-bold text-pink-400">3. Filter Extreme Outliers</p>
                    <p className="text-slate-500 leading-relaxed text-[11px]">K-means clustering and regressions are highly sensitive to extreme outliers. Check outlier boxes to exclude them.</p>
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CleaningPage;
