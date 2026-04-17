import React, { useState } from 'react';
import { Document } from '../../types/document';
import { SummarizationRequest } from '../../types/document';
import documentService from '../../services/documentService';
import FileUpload from '../common/FileUpload';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const Summarization: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  
  // Form inputs
  const [topicName, setTopicName] = useState('');
  const [pageNumber, setPageNumber] = useState('');

  React.useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await documentService.getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load documents');
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile(file);
    setError(null);
  };

  const handleClearFile = () => {
    setUploadedFile(null);
  };

  const handleUploadDocument = async () => {
    if (!uploadedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const document = await documentService.uploadDocument(uploadedFile);
      setDocuments(prev => [document, ...prev]);
      setSelectedDocument(document);
      setUploadedFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedDocument) {
      setError('Please select or upload a document');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSummary(null);

      const request: SummarizationRequest = {
        document_id: selectedDocument.id,
        parameters: {},
        topic_name: topicName || undefined,
        page_number: pageNumber ? parseInt(pageNumber) : undefined,
      };

      const response = await documentService.summarizeDocument(request);
      
      if (response.success && response.data?.summary) {
        setSummary(response.data.summary);
      } else {
        setError(response.error || 'Failed to generate summary');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Summarization</h1>
        <p className="text-gray-600">Generate concise summaries of your academic documents</p>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Document Upload and Inputs */}
        <div className="space-y-6">
          {/* Document Upload Section */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Document Upload</h2>
            
            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFile={uploadedFile}
              onClearFile={handleClearFile}
              className="mb-4"
            />

            <div className="flex space-x-3">
              <button
                onClick={handleUploadDocument}
                disabled={!uploadedFile || uploading}
                className="btn btn-primary disabled:opacity-50"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    Uploading...
                  </div>
                ) : (
                  'Upload File'
                )}
              </button>
            </div>
          </div>

          {/* Document Selection */}
          {documents.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Select Document</h2>
              <select
                value={selectedDocument?.id || ''}
                onChange={(e) => {
                  const doc = documents.find(d => d.id === parseInt(e.target.value));
                  setSelectedDocument(doc || null);
                }}
                className="input-field"
              >
                <option value="">Choose a document...</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.filename} ({doc.file_type.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Input Controls */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Summarization Options</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                  Topic Name (Optional)
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                  placeholder="e.g., Machine Learning, Photosynthesis"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Focus summary on specific topic
                </p>
              </div>

              <div>
                <label htmlFor="page" className="block text-sm font-medium text-gray-700 mb-1">
                  Page Number (Optional)
                </label>
                <input
                  id="page"
                  type="number"
                  value={pageNumber}
                  onChange={(e) => setPageNumber(e.target.value)}
                  placeholder="e.g., 5"
                  min="1"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Summarize content from specific page
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateSummary}
              disabled={!selectedDocument || loading}
              className="w-full mt-6 btn btn-primary disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating Summary...
                </div>
              ) : (
                'Generate Summary'
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Output */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Generated Summary</h2>
          
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : summary ? (
            <div className="prose max-w-none">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="whitespace-pre-wrap text-gray-800">{summary}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">Upload a document and generate a summary to see the results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Summarization;
