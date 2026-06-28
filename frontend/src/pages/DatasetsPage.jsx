import React, { useState } from 'react';
import { useDataset } from '../context/DatasetContext';
import { useTheme } from '../context/ThemeContext';
import UploadZone from '../components/UploadZone';
import GlassCard from '../components/GlassCard';
import { Database, Trash2, Calendar, FileSpreadsheet, List, Eye, Info } from 'lucide-react';

const DatasetsPage = () => {
  const { 
    datasets, 
    selectedDataset, 
    setSelectedDataset, 
    previewData, 
    previewLoading, 
    deleteDataset, 
    loading 
  } = useDataset();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('dictionary'); // 'dictionary' or 'preview'

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this dataset? All associated insights will be removed.')) {
      try {
        await deleteDataset(id);
      } catch (err) {
        alert('Failed to delete dataset.');
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white m-0">Datasets Manager</h1>
        <p className="text-xs text-slate-500 mt-1">Upload and manage datasets, review datatypes, and browse structured spreadsheets</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Upload and History */}
        <div className="lg:col-span-1 space-y-6">
          <GlassCard>
            <h3 className="text-sm font-semibold text-slate-300 tracking-wide uppercase mb-4">Upload New File</h3>
            <UploadZone />
          </GlassCard>

          <GlassCard className="flex flex-col max-h-[400px]">
            <h3 className="text-sm font-semibold text-slate-300 tracking-wide uppercase mb-4">Dataset History</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {datasets.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No datasets uploaded yet.</div>
              ) : (
                datasets.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setSelectedDataset(d)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedDataset?.id === d.id
                        ? theme !== 'midnight'
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 shadow-glass-light'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-800'
                        : theme !== 'midnight'
                          ? 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className="h-5 w-5 shrink-0 text-indigo-400" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{d.filename}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {d.row_count.toLocaleString()} rows &bull; {(d.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={(e) => handleDelete(e, d.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Structure & Preview */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDataset ? (
            <GlassCard className="flex flex-col h-full min-h-[500px]">
              {/* Tab Selector Header */}
              <div className="flex items-center justify-between border-b border-slate-800/65 pb-3 mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('dictionary')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'dictionary'
                        ? 'bg-indigo-600 text-white'
                        : theme !== 'midnight'
                          ? 'text-slate-400 hover:bg-slate-800'
                          : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Info className="h-3.5 w-3.5" />
                    <span>Data Dictionary</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'preview'
                        ? 'bg-indigo-600 text-white'
                        : theme !== 'midnight'
                          ? 'text-slate-400 hover:bg-slate-800'
                          : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Dataset Preview</span>
                  </button>
                </div>
                
                <span className="text-[10px] text-slate-500 font-medium">
                  ID: #{selectedDataset.id} &bull; {selectedDataset.filename}
                </span>
              </div>

              {/* Tab 1: Data Dictionary */}
              {activeTab === 'dictionary' && (
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={theme !== 'midnight' ? 'bg-slate-900/60' : 'bg-slate-100'}>
                        <th className="p-3 border border-slate-800/40 text-slate-400 font-semibold">Column Name</th>
                        <th className="p-3 border border-slate-800/40 text-slate-400 font-semibold">Detected Type</th>
                        <th className="p-3 border border-slate-800/40 text-slate-400 font-semibold">Missing Value %</th>
                        <th className="p-3 border border-slate-800/40 text-slate-400 font-semibold">Unique Count</th>
                        <th className="p-3 border border-slate-800/40 text-slate-400 font-semibold">Sample Values</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDataset.metadata?.data_dictionary?.map((item, idx) => {
                        const colMeta = selectedDataset.metadata?.columns?.[item.column_name] || {};
                        return (
                          <tr key={idx} className="hover:bg-slate-850/20 transition-colors">
                            <td className="p-3 border border-slate-800/40 font-bold text-slate-200">{item.column_name}</td>
                            <td className="p-3 border border-slate-800/40">
                              <span className={`px-2 py-0.5 rounded-full font-medium text-[10px] uppercase ${
                                item.detected_type === 'numeric' ? 'bg-blue-500/10 text-blue-400' :
                                item.detected_type === 'date' ? 'bg-indigo-500/10 text-indigo-400' :
                                item.detected_type === 'categorical' ? 'bg-purple-500/10 text-purple-400' :
                                item.detected_type === 'boolean' ? 'bg-pink-500/10 text-pink-400' :
                                'bg-slate-500/10 text-slate-400'
                              }`}>
                                {item.detected_type}
                              </span>
                            </td>
                            <td className="p-3 border border-slate-800/40 text-slate-400">
                              {item.null_percentage.toFixed(1)}%
                            </td>
                            <td className="p-3 border border-slate-800/40 text-slate-400">
                              {item.unique_values.toLocaleString()}
                            </td>
                            <td className="p-3 border border-slate-800/40 text-slate-500 truncate max-w-[200px]" title={colMeta.sample_values?.join(', ')}>
                              {colMeta.sample_values?.join(', ') || 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab 2: Spreadsheet Preview */}
              {activeTab === 'preview' && (
                <div className="flex-1 flex flex-col min-h-0">
                  {previewLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                      <span className="text-xs text-slate-400">Loading spreadsheet grid...</span>
                    </div>
                  ) : previewData ? (
                    <div className="flex-1 overflow-auto max-h-[500px]">
                      <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                        <thead className="sticky top-0 z-10">
                          <tr className={theme !== 'midnight' ? 'bg-slate-900' : 'bg-slate-100'}>
                            <th className="p-2 border border-slate-800/60 text-slate-400 font-semibold">#</th>
                            {previewData.columns.map((col) => (
                              <th key={col} className="p-2.5 border border-slate-800/60 text-slate-200 font-bold">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.data.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-850/20 transition-colors">
                              <td className="p-2 border border-slate-800/40 text-slate-600 text-center font-medium bg-slate-950/20 sticky left-0">
                                {idx + 1}
                              </td>
                              {previewData.columns.map((col) => (
                                <td key={col} className="p-2.5 border border-slate-800/40 text-slate-300">
                                  {row[col] === null || row[col] === undefined ? (
                                    <span className="text-rose-500/60 font-semibold italic text-[10px]">null</span>
                                  ) : (
                                    String(row[col])
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-500 text-xs">Failed to load preview data.</div>
                  )}
                  <div className="border-t border-slate-800/60 pt-3 mt-3 flex justify-between items-center text-[10px] text-slate-500">
                    <span>Showing top 100 rows preview (Lazy loaded)</span>
                    <span>Total rows in dataset: {selectedDataset.row_count.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </GlassCard>
          ) : (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center border border-dashed border-slate-800/60 rounded-2xl p-6 text-slate-500">
              <Database className="h-10 w-10 text-slate-600 mb-3 animate-float" />
              <p className="text-sm font-semibold">Select or upload a dataset to begin</p>
              <p className="text-xs text-slate-600 mt-1">Your data dictionary and preview will render dynamically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatasetsPage;
