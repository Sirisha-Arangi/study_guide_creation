import React, { useState } from 'react';
import { Document, ContentGapRequest, ContentAnalysis } from '../../types/document';
import documentService from '../../services/documentService';
import FileUpload from '../common/FileUpload';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const ContentGap: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentAnalysis, setContentAnalysis] = useState<ContentAnalysis | null>(null);
  
  // Form inputs
  const [referenceSyllabus, setReferenceSyllabus] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced' | ''>('');

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

  const handleDetectContentGaps = async () => {
    if (!selectedDocument) {
      setError('Please select or upload a document');
      return;
    }

    if (!referenceSyllabus.trim()) {
      setError('Please provide a reference syllabus or topic list');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setContentAnalysis(null);

      const request: ContentGapRequest = {
        document_id: selectedDocument.id,
        parameters: {},
        reference_syllabus: referenceSyllabus.trim(),
        difficulty: difficulty || undefined,
      };

      const response = await documentService.detectContentGaps(request);
      
      if (response.success && response.data?.content_analysis) {
        setContentAnalysis(response.data.content_analysis);
      } else {
        setError(response.error || 'Failed to detect content gaps');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to detect content gaps');
    } finally {
      setLoading(false);
    }
  };

  const getCoverageColor = (score: string) => {
    const numScore = parseInt(score.replace('%', ''));
    if (numScore >= 80) return 'bg-green-100 text-green-800';
    if (numScore >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Gap Detector</h1>
        <p className="text-gray-600">Analyze documents against reference syllabus to identify gaps</p>
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Analysis Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="syllabus" className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Syllabus / Topic List *
                </label>
                <textarea
                  id="syllabus"
                  value={referenceSyllabus}
                  onChange={(e) => setReferenceSyllabus(e.target.value)}
                  placeholder="Enter the reference syllabus or list of topics..."
                  rows={6}
                  className="input-field resize-none"
                />
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level (Optional)
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced' | '')}
                  className="input-field"
                >
                  <option value="">Not specified</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleDetectContentGaps}
              disabled={!selectedDocument || !referenceSyllabus.trim() || loading}
              className="w-full mt-6 btn btn-primary disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Detecting Content Gaps...
                </div>
              ) : (
                'Detect Content Gaps'
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Output */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-lg font-medium text-gray-900">Content Gap Analysis</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <LoadingSpinner size="lg" />
            </div>
          ) : contentAnalysis ? (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                {/* Summary and Coverage Score */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Analysis Summary</h3>
                  <p className="text-gray-700 mb-3">{contentAnalysis.summary}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Coverage Score:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCoverageColor(contentAnalysis.coverage_score)}`}>
                      {contentAnalysis.coverage_score}
                    </span>
                  </div>
                </div>

                {/* Well Covered Topics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    ✅ Well Covered Topics ({contentAnalysis.topics?.well_covered?.length || 0})
                  </h4>
                  {contentAnalysis.topics?.well_covered?.length > 0 ? (
                    <div className="space-y-3">
                      {contentAnalysis.topics.well_covered.map((topic, index) => (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h5 className="font-medium text-green-900 mb-1">{topic.topic}</h5>
                          {topic.evidence && (
                            <p className="text-sm text-green-700 mt-1">
                              <span className="font-medium">Evidence:</span> {topic.evidence}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No topics are well covered</p>
                  )}
                </div>

                {/* Weakly Covered Topics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    ⚠️ Weakly Covered Topics ({contentAnalysis.topics?.weakly_covered?.length || 0})
                  </h4>
                  {contentAnalysis.topics?.weakly_covered?.length > 0 ? (
                    <div className="space-y-3">
                      {contentAnalysis.topics.weakly_covered.map((topic, index) => (
                        <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <h5 className="font-medium text-yellow-900 mb-1">{topic.topic}</h5>
                          {topic.issue && (
                            <p className="text-sm text-yellow-700 mb-2">
                              <span className="font-medium">Issue:</span> {topic.issue}
                            </p>
                          )}
                          {topic.recommendation && (
                            <p className="text-sm text-yellow-700">
                              <span className="font-medium">Recommendation:</span> {topic.recommendation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No topics with weak coverage</p>
                  )}
                </div>

                {/* Missing Topics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    ❌ Missing Topics ({contentAnalysis.topics?.missing?.length || 0})
                  </h4>
                  {contentAnalysis.topics?.missing?.length > 0 ? (
                    <div className="space-y-3">
                      {contentAnalysis.topics.missing.map((topic, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                          <h5 className="font-medium text-red-900 mb-1">{topic.topic}</h5>
                          <p className="text-sm text-red-700">
                            <span className="font-medium">Recommendation:</span> {topic.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No missing topics</p>
                  )}
                </div>

                {/* Overall Recommendations */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Overall Recommendations</h4>
                  <ul className="space-y-2">
                    {contentAnalysis.recommendations?.map((recommendation, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-blue-600 mr-2">•</span>
                        <span className="text-gray-700">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">Upload a document, provide a reference syllabus, and detect content gaps to see analysis here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContentGap;
