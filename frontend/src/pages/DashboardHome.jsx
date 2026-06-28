import React from 'react';
import { useDataset } from '../context/DatasetContext';
import { useTheme } from '../context/ThemeContext';
import KPIWidget from '../components/KPIWidget';
import UploadZone from '../components/UploadZone';
import PlotlyChart from '../components/PlotlyChart';
import GlassCard from '../components/GlassCard';
import { Database, FileSpreadsheet, Sparkles, MessageSquare, TrendingUp, HelpCircle } from 'lucide-react';

const DashboardHome = () => {
  const { selectedDataset, previewData, previewLoading, loading } = useDataset();
  const { theme } = useTheme();

  // Smart visual picker based on metadata
  const renderAutoCharts = () => {
    if (!selectedDataset || !selectedDataset.metadata) return null;
    const meta = selectedDataset.metadata;
    const columns = meta.columns || {};
    
    const numericCols = Object.keys(columns).filter(c => columns[c].type === 'numeric');
    const catCols = Object.keys(columns).filter(c => columns[c].type === 'categorical');
    const dateCols = Object.keys(columns).filter(c => columns[c].type === 'date');

    const charts = [];

    // Chart 1: Bar Chart of Top Categorical Column Frequencies (from precomputed metadata)
    if (catCols.length > 0) {
      const targetCat = catCols[0];
      const freqObj = columns[targetCat].summary?.top_values || {};
      const x = Object.keys(freqObj);
      const y = Object.values(freqObj);
      
      if (x.length > 0) {
        charts.push({
          title: `Category Distribution: ${targetCat}`,
          data: [{
            x: x,
            y: y,
            type: 'bar',
            text: y.map(v => typeof v === 'number' ? v.toLocaleString() : v),
            textposition: 'outside',
            marker: { color: 'rgba(99, 102, 241, 0.7)', line: { color: 'rgb(99, 102, 241)', width: 1.5 } }
          }],
          layout: {
            xaxis: { title: targetCat },
            yaxis: { title: 'Frequency' },
            height: 600
          }
        });
      }
    }

    // Load from preview data for line/scatter/histogram
    if (previewData && previewData.data && previewData.data.length > 0) {
      const records = previewData.data;

      // Chart 2: Time series line plot if date & numeric exist
      if (dateCols.length > 0 && numericCols.length > 0) {
        const dateCol = dateCols[0];
        const numCol = numericCols[0];
        
        // Sort values by date for line plot representation
        const sortedRecords = [...records]
          .filter(r => r[dateCol] && r[numCol] !== null)
          .sort((a, b) => new Date(a[dateCol]) - new Date(b[dateCol]));

        if (sortedRecords.length > 0) {
          charts.push({
            title: `Trend: ${numCol} over Time`,
            data: [{
              x: sortedRecords.map(r => r[dateCol]),
              y: sortedRecords.map(r => r[numCol]),
              type: 'scatter',
              mode: 'lines+markers+text',
              text: sortedRecords.map(r => typeof r[numCol] === 'number' ? r[numCol].toFixed(0) : r[numCol]),
              textposition: 'top center',
              line: { color: '#818cf8', width: 2 },
              marker: { size: 4, color: '#4f46e5' }
            }],
            layout: {
              xaxis: { title: dateCol },
              yaxis: { title: numCol },
              height: 600
            }
          });
        }
      }

      // Chart 3: Histogram of numeric distribution
      if (numericCols.length > 0) {
        const numCol = numericCols[0];
        const values = records.map(r => r[numCol]).filter(v => v !== null);
        
        if (values.length > 0) {
          charts.push({
            title: `Distribution of ${numCol}`,
            data: [{
              x: values,
              type: 'histogram',
              nbinsx: 20,
              texttemplate: '%{y}',
              textposition: 'outside',
              marker: { color: 'rgba(168, 85, 247, 0.6)', line: { color: 'rgb(168, 85, 247)', width: 1 } }
            }],
            layout: {
              xaxis: { title: numCol },
              yaxis: { title: 'Count' },
              height: 600
            }
          });
        }
      }

      // Chart 4: Correlation Scatter plot of first two numeric columns
      if (numericCols.length >= 2) {
        const colX = numericCols[0];
        const colY = numericCols[1];
        const xVals = records.map(r => r[colX]).filter(v => v !== null);
        const yVals = records.map(r => r[colY]).filter(v => v !== null);

        if (xVals.length > 0 && yVals.length > 0) {
          charts.push({
            title: `Correlation Scatter: ${colX} vs ${colY}`,
            data: [{
              x: records.map(r => r[colX]),
              y: records.map(r => r[colY]),
              type: 'scatter',
              mode: 'markers+text',
              text: records.map(r => typeof r[colY] === 'number' ? r[colY].toFixed(0) : r[colY]),
              textposition: 'top center',
              marker: { color: '#ec4899', size: 6, opacity: 0.7 }
            }],
            layout: {
              xaxis: { title: colX },
              yaxis: { title: colY },
              height: 600
            }
          });
        }
      }
    }

    if (charts.length === 0) return null;

    return (
      <div className="flex flex-col gap-6 mt-6 w-full">
        {charts.map((chart, idx) => (
          <GlassCard key={idx} className="w-full">
            <h4 className="text-sm font-semibold mb-4 text-slate-300 tracking-wide uppercase">
              {chart.title}
            </h4>
            <PlotlyChart data={chart.data} layout={chart.layout} className="h-[620px]" />
          </GlassCard>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest mb-1.5 rainbow-animated-text">
            an application by ganga dheeresh
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Dashboard Home</h1>
          <p className="text-xs text-slate-500 mt-1">
            {selectedDataset 
              ? `Real-time analytics and summaries for ${selectedDataset.filename}` 
              : 'Welcome! Upload a file to generate summaries.'
            }
          </p>
        </div>
        
        {selectedDataset && (
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
            <Database className="h-4 w-4 text-indigo-400" />
            <span>{selectedDataset.filename} ({(selectedDataset.file_size / 1024).toFixed(1)} KB)</span>
          </div>
        )}
      </div>

      {selectedDataset ? (
        <>
          {/* Key Facts */}
          <KPIWidget metadata={selectedDataset.metadata} />
          
          {/* Automated Visualizations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white">Auto-Generated Charts</h3>
            </div>
            
            {previewLoading ? (
              <div className="h-80 flex flex-col items-center justify-center glass-panel rounded-2xl border border-glass">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-2"></div>
                <span className="text-xs text-slate-400">Loading chart variables...</span>
              </div>
            ) : (
              renderAutoCharts()
            )}
          </div>
        </>
      ) : (
        /* Empty State Layout */
        <div className="space-y-8 max-w-4xl mx-auto py-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white tracking-tight">Let's Get Started!</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Upload any Excel sheet or CSV dataset below. We will automatically map structural metrics and compile analytics.
            </p>
          </div>

          <GlassCard className="p-8">
            <UploadZone />
          </GlassCard>

          {/* Guidelines */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div className="flex gap-3">
              <div className="p-2.5 h-10 w-10 shrink-0 bg-indigo-500/10 rounded-xl text-indigo-400 flex items-center justify-center font-bold">1</div>
              <div>
                <h4 className="font-semibold text-sm text-white">Detect Columns</h4>
                <p className="text-xs text-slate-500 mt-1">Infers data shapes, missing value patterns, and datatypes without manual mapping.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="p-2.5 h-10 w-10 shrink-0 bg-purple-500/10 rounded-xl text-purple-400 flex items-center justify-center font-bold">2</div>
              <div>
                <h4 className="font-semibold text-sm text-white">Auto Clean</h4>
                <p className="text-xs text-slate-500 mt-1">Strips duplicates, filters outliers, and fills empty cells in a few clicks.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="p-2.5 h-10 w-10 shrink-0 bg-pink-500/10 rounded-xl text-pink-400 flex items-center justify-center font-bold">3</div>
              <div>
                <h4 className="font-semibold text-sm text-white">Ask Questions</h4>
                <p className="text-xs text-slate-500 mt-1">Enter natural queries to render immediate custom charts and summaries.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
