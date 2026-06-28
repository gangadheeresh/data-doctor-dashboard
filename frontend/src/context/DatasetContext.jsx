import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import { useAuth } from './AuthContext';

const DatasetContext = createContext();

export const DatasetProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [datasets, setDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchDatasets = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const data = await apiFetch('/datasets');
      setDatasets(data);
      // Auto select first dataset if none selected
      if (data.length > 0 && !selectedDataset) {
        setSelectedDataset(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch datasets:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [isAuthenticated]);

  // Load preview data when active dataset changes
  useEffect(() => {
    if (selectedDataset) {
      fetchPreview(selectedDataset.id);
    } else {
      setPreviewData(null);
    }
  }, [selectedDataset]);

  const fetchPreview = async (datasetId) => {
    setPreviewLoading(true);
    try {
      const data = await apiFetch(`/datasets/${datasetId}/preview?limit=100`);
      setPreviewData(data);
    } catch (error) {
      console.error('Failed to load dataset preview:', error);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const uploadDataset = async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const data = await apiFetch('/datasets/upload', {
        method: 'POST',
        body: formData,
      });
      
      setDatasets((prev) => [data.dataset, ...prev]);
      setSelectedDataset(data.dataset);
      return data.dataset;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteDataset = async (datasetId) => {
    try {
      await apiFetch(`/datasets/${datasetId}`, { method: 'DELETE' });
      setDatasets((prev) => prev.filter((d) => d.id !== datasetId));
      if (selectedDataset?.id === datasetId) {
        const remaining = datasets.filter((d) => d.id !== datasetId);
        setSelectedDataset(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      throw error;
    }
  };

  const loadDatasetDetails = async (datasetId) => {
    try {
      const data = await apiFetch(`/datasets/${datasetId}`);
      // Update selected
      setSelectedDataset(data);
      setDatasets((prev) => prev.map((d) => (d.id === datasetId ? data : d)));
      return data;
    } catch (error) {
      console.error('Failed to load dataset details:', error);
    }
  };

  const getCleaningSuggestions = async (datasetId) => {
    return await apiFetch(`/datasets/${datasetId}/cleaning-suggestions`);
  };

  const executeClean = async (datasetId, instructions) => {
    setLoading(true);
    try {
      const data = await apiFetch(`/datasets/${datasetId}/clean`, {
        method: 'POST',
        body: JSON.stringify(instructions),
      });
      setSelectedDataset(data.dataset);
      setDatasets((prev) => prev.map((d) => (d.id === datasetId ? data.dataset : d)));
      await fetchPreview(datasetId);
      return data.dataset;
    } catch (error) {
      console.error('Cleaning failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    datasets,
    selectedDataset,
    setSelectedDataset,
    previewData,
    loading,
    previewLoading,
    fetchDatasets,
    uploadDataset,
    deleteDataset,
    loadDatasetDetails,
    getCleaningSuggestions,
    executeClean,
  };

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
};

export const useDataset = () => useContext(DatasetContext);
