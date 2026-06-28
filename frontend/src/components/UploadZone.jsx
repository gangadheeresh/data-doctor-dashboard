import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { useDataset } from '../context/DatasetContext';

const UploadZone = ({ onUploadSuccess = null }) => {
  const { uploadDataset } = useDataset();
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file) return;
    
    // Check file extension
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(extension)) {
      setError('Unsupported file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls).');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const dataset = await uploadDataset(file);
      if (onUploadSuccess) {
        onUploadSuccess(dataset);
      }
    } catch (err) {
      setError(err.message || 'File upload failed. Ensure the format is valid.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`w-full py-10 px-6 border-2 border-dashed rounded-2xl cursor-pointer flex flex-col items-center justify-center transition-all duration-300 ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv, .xlsx, .xls"
          onChange={handleFileChange}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-3" />
            <p className="text-slate-300 font-medium">Processing & Analyzing Dataset...</p>
            <p className="text-slate-500 text-sm mt-1">Extracting data dictionary and statistical summaries...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center">
            <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 mb-4 animate-float">
              <Upload className="h-8 w-8" />
            </div>
            
            <h3 className="text-lg font-semibold mb-1 text-slate-100">
              Drag & Drop your dataset here
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              or <span className="text-indigo-400 font-medium">browse files</span> on your computer
            </p>
            
            <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-slate-800/60 pt-4 w-full justify-center">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" /> CSV
              </span>
              <span className="h-1 w-1 bg-slate-700 rounded-full"></span>
              <span className="flex items-center gap-1">
                <FileSpreadsheet className="h-3 w-3" /> Excel (XLSX, XLS)
              </span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-start gap-2 animate-pulse-glow">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default UploadZone;
