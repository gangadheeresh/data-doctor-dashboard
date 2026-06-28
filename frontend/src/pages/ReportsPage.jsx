import React, { useState } from 'react';
import { useDataset } from '../context/DatasetContext';
import { useTheme } from '../context/ThemeContext';
import { BASE_URL } from '../utils/api';
import GlassCard from '../components/GlassCard';
import { FileDown, FileText, FileSpreadsheet, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

const ReportsPage = () => {
  const { selectedDataset } = useDataset();
  const { theme } = useTheme();
  
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingData, setDownloadingData] = useState(false);

  const handleDownloadPDF = async () => {
    if (!selectedDataset) return;
    setDownloadingPDF(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/export/${selectedDataset.id}/report`, {
        method: 'GET',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) throw new Error('PDF generation failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AI_Insights_Report_${selectedDataset.filename.split('.')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error generating PDF report.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadCleaned = async () => {
    if (!selectedDataset) return;
    setDownloadingData(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BASE_URL}/export/${selectedDataset.id}/cleaned`, {
        method: 'GET',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) throw new Error('File download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Cleaned_${selectedDataset.filename}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Error exporting cleaned dataset.');
    } finally {
      setDownloadingData(false);
    }
  };

  if (!selectedDataset) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-slate-500">
        <FileDown className="h-10 w-10 text-slate-600 mb-3 animate-float" />
        <p className="text-sm font-semibold">Select a dataset first to download reports</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white m-0">Exports & Reports</h1>
        <p className="text-xs text-slate-500 mt-1">Export cleaned datasets and download formatted analytical reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export options */}
        <div className="space-y-6">
          <GlassCard className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 tracking-wide uppercase mb-2">Select Export Target</h3>
            
            {/* Option 1: PDF */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              theme !== 'midnight' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-200">AI PDF Insights Report</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Includes size KPIs, data dictionary matrix, and trend summaries.</p>
                </div>
              </div>
              
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-850 disabled:text-slate-600 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shrink-0"
              >
                {downloadingPDF ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Export PDF</span>
                )}
              </button>
            </div>

            {/* Option 2: Cleaned & Modified Data */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              theme !== 'midnight' ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-slate-200">Cleaned & Modified Spreadsheet</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Download your worked dataset file with all cleaning steps, modifications, and activities applied.</p>
                </div>
              </div>
              
              <button
                onClick={handleDownloadCleaned}
                disabled={downloadingData}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-850 disabled:text-slate-600 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors shrink-0"
              >
                {downloadingData ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Download File</span>
                )}
              </button>
            </div>
          </GlassCard>
        </div>

        {/* Report Preview simulation */}
        <div className="space-y-6">
          <GlassCard className="flex flex-col min-h-[300px] justify-between relative overflow-hidden group">
            {/* simulated lines */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wide">Report Compiler Preview</h4>
              </div>
              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <div className="h-3 w-2/3 bg-slate-800 rounded"></div>
                <div className="h-3 w-1/2 bg-slate-800 rounded"></div>
                
                <div className="p-3 bg-slate-950/20 border border-slate-900 rounded-xl space-y-2">
                  <div className="h-2 w-1/3 bg-indigo-500/20 rounded"></div>
                  <div className="h-2.5 w-full bg-slate-800 rounded"></div>
                  <div className="h-2.5 w-full bg-slate-800 rounded"></div>
                </div>

                <div className="p-3 bg-slate-950/20 border border-slate-900 rounded-xl space-y-2">
                  <div className="h-2 w-1/3 bg-indigo-500/20 rounded"></div>
                  <div className="h-2.5 w-full bg-slate-800 rounded"></div>
                  <div className="h-2.5 w-full bg-slate-800 rounded"></div>
                </div>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 mt-6 leading-relaxed">
              Export builds live PDF formatting streams containing active cells summaries and detected relationships. Ensure that you have run the Data Cleaning tab first to secure high statistical accuracy.
            </p>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
