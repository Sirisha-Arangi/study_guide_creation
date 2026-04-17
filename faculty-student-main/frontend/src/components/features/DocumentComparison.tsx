import React, { useState } from 'react';
import { Document, DocumentComparisonRequest, DocumentComparison as DocumentComparisonType } from '../../types/document';
import documentService from '../../services/documentService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import FileUpload from '../common/FileUpload';

const DocumentComparison: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentA, setDocumentA] = useState<Document | null>(null);
  const [documentB, setDocumentB] = useState<Document | null>(null);
  const [uploadedFileA, setUploadedFileA] = useState<File | null>(null);
  const [uploadedFileB, setUploadedFileB] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<DocumentComparisonType | null>(null);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);

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

  const handleFileSelectA = (file: File) => {
    setUploadedFileA(file);
    setError(null);
  };

  const handleFileSelectB = (file: File) => {
    setUploadedFileB(file);
    setError(null);
  };

  const handleClearFileA = () => {
    setUploadedFileA(null);
  };

  const handleClearFileB = () => {
    setUploadedFileB(null);
  };

  const handleUploadDocumentA = async () => {
    if (!uploadedFileA) {
      setError('Please select a file for Document A');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const document = await documentService.uploadDocument(uploadedFileA);
      setDocuments(prev => [document, ...prev]);
      setDocumentA(document);
      setUploadedFileA(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload Document A');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadDocumentB = async () => {
    if (!uploadedFileB) {
      setError('Please select a file for Document B');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      const document = await documentService.uploadDocument(uploadedFileB);
      setDocuments(prev => [document, ...prev]);
      setDocumentB(document);
      setUploadedFileB(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload Document B');
    } finally {
      setUploading(false);
    }
  };

  const handleCompareDocuments = async () => {
    if (!documentA || !documentB) {
      setError('Please select both documents to compare');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setComparison(null);
      
      const request: DocumentComparisonRequest = {
        document_a_id: documentA.id,
        document_b_id: documentB.id,
        focus_areas: focusAreas.length > 0 ? focusAreas : undefined
      };

      console.log('Sending comparison request:', request);
      const response = await documentService.compareDocuments(request);
      
      if (response.success && response.data?.comparison) {
        console.log('Comparison successful:', response.data.comparison);
        setComparison(response.data.comparison);
      } else {
        console.error('Comparison failed:', response.error);
        setError(response.error || 'Failed to compare documents');
      }
    } catch (err: any) {
      console.error('Error during comparison:', err);
      setError(err.response?.data?.detail || 'Failed to compare documents');
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (score: string | undefined) => {
    if (!score) return 'bg-gray-100 text-gray-800';
    
    const numScore = parseInt(score.replace('%', ''));
    if (isNaN(numScore)) return 'bg-gray-100 text-gray-800';
    
    if (numScore >= 80) return 'bg-green-100 text-green-800';
    if (numScore >= 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Document Comparison</h1>
        <p className="text-gray-600">Compare two documents to identify similarities, differences, and content relationships</p>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Document Selection */}
        <div className="space-y-6">
          {/* Document A Upload */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Document A</h2>
            
            <FileUpload
              onFileSelect={handleFileSelectA}
              selectedFile={uploadedFileA}
              onClearFile={handleClearFileA}
              className="mb-4"
            />

            <div className="flex space-x-3">
              <button
                onClick={handleUploadDocumentA}
                disabled={!uploadedFileA || uploading}
                className="btn btn-primary disabled:opacity-50"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    Uploading...
                  </div>
                ) : (
                  'Upload Document A'
                )}
              </button>
            </div>
          </div>

          {/* Document B Upload */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Document B</h2>
            
            <FileUpload
              onFileSelect={handleFileSelectB}
              selectedFile={uploadedFileB}
              onClearFile={handleClearFileB}
              className="mb-4"
            />

            <div className="flex space-x-3">
              <button
                onClick={handleUploadDocumentB}
                disabled={!uploadedFileB || uploading}
                className="btn btn-primary disabled:opacity-50"
              >
                {uploading ? (
                  <div className="flex items-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    Uploading...
                  </div>
                ) : (
                  'Upload Document B'
                )}
              </button>
            </div>
          </div>

          {/* Document Selection */}
          {documents.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Select Documents</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="doc-a" className="block text-sm font-medium text-gray-700 mb-1">
                    Document A
                  </label>
                  <select
                    id="doc-a"
                    value={documentA?.id || ''}
                    onChange={(e) => {
                      const doc = documents.find(d => d.id === parseInt(e.target.value));
                      setDocumentA(doc || null);
                    }}
                    className="input-field"
                  >
                    <option value="">Choose Document A...</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.filename} ({doc.file_type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="doc-b" className="block text-sm font-medium text-gray-700 mb-1">
                    Document B
                  </label>
                  <select
                    id="doc-b"
                    value={documentB?.id || ''}
                    onChange={(e) => {
                      const doc = documents.find(d => d.id === parseInt(e.target.value));
                      setDocumentB(doc || null);
                    }}
                    className="input-field"
                  >
                    <option value="">Choose Document B...</option>
                    {documents.map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.filename} ({doc.file_type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Focus Areas */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Focus Areas (Optional)</h2>
            
            <div>
              <label htmlFor="focus-areas" className="block text-sm font-medium text-gray-700 mb-1">
                Specific areas to focus on during comparison
              </label>
              <textarea
                id="focus-areas"
                value={focusAreas.join('\n')}
                onChange={(e) => setFocusAreas(e.target.value.split('\n').filter(area => area.trim()))}
                placeholder="Enter specific topics or areas to focus on&#10;One topic per line&#10;Leave empty for general comparison"
                rows={4}
                className="input-field resize-none"
              />
            </div>

            <button
              onClick={handleCompareDocuments}
              disabled={!documentA || !documentB || loading}
              className="w-full btn btn-primary disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Comparing Documents...
                </div>
              ) : (
                'Compare Documents'
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Comparison Results */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-lg font-medium text-gray-900">Comparison Results</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <LoadingSpinner size="lg" />
            </div>
          ) : comparison ? (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                {/* Summary and Similarity Score */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Comparison Summary</h3>
                  <p className="text-gray-700 mb-3">{comparison.summary}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Similarity Score:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSimilarityColor(comparison.similarity_analysis?.overall_similarity_score)}`}>
                      {comparison.similarity_analysis?.overall_similarity_score || 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Shared Topics */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    🔗 Shared Topics ({comparison.shared_topics?.length || 0})
                  </h4>
                  {comparison.shared_topics?.length > 0 ? (
                    <div className="space-y-3">
                      {comparison.shared_topics.map((topic: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <h5 className="font-medium text-gray-900 mb-2">{topic.topic}</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-blue-700">Document A Coverage:</p>
                              <p className="text-sm text-gray-600">{topic.coverage_in_a}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-green-700">Document B Coverage:</p>
                              <p className="text-sm text-gray-600">{topic.coverage_in_b}</p>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              topic.similarity_level === 'high' ? 'bg-green-100 text-green-800' :
                              topic.similarity_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              Similarity: {topic.similarity_level}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No shared topics identified</p>
                  )}
                </div>

                {/* Unique to Document A */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    📄 Unique to Document A ({comparison.unique_to_a?.length || 0})
                  </h4>
                  {comparison.unique_to_a?.length > 0 ? (
                    <div className="space-y-3">
                      {comparison.unique_to_a.map((topic: any, index: number) => (
                        <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h5 className="font-medium text-green-900 mb-1">{topic.topic}</h5>
                          <p className="text-sm text-green-700 mb-2">{topic.description}</p>
                          <p className="text-sm text-green-700">
                            <span className="font-medium">Value:</span> {topic.value_addition}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No unique topics identified for Document A</p>
                  )}
                </div>

                {/* Unique to Document B */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    📄 Unique to Document B ({comparison.unique_to_b?.length || 0})
                  </h4>
                  {comparison.unique_to_b?.length > 0 ? (
                    <div className="space-y-3">
                      {comparison.unique_to_b.map((topic: any, index: number) => (
                        <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <h5 className="font-medium text-blue-900 mb-1">{topic.topic}</h5>
                          <p className="text-sm text-blue-700 mb-2">{topic.description}</p>
                          <p className="text-sm text-blue-700">
                            <span className="font-medium">Value:</span> {topic.value_addition}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No unique topics identified for Document B</p>
                  )}
                </div>

                {/* Recommendations */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">
                    💡 Recommendations
                  </h4>
                  <div className="space-y-3">
                    {/* Synergy Opportunities */}
                    {comparison.recommendations.synergy_opportunities?.length > 0 && (
                      <div className="mb-4">
                        <h5 className="font-medium text-gray-700 mb-2">Synergy Opportunities</h5>
                        {comparison.recommendations.synergy_opportunities.map((recommendation: any, index: number) => (
                          <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800">
                              {typeof recommendation === 'string' ? recommendation : recommendation.opportunity || 'Recommendation'}
                            </p>
                            {recommendation.implementation_details && (
                              <p className="text-xs text-yellow-600 mt-1">
                                Details: {recommendation.implementation_details}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Improvement Suggestions */}
                    {comparison.recommendations.improvement_suggestions?.length > 0 && (
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">Improvement Suggestions</h5>
                        {comparison.recommendations.improvement_suggestions.map((suggestion: any, index: number) => (
                          <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                            <p className="text-sm text-orange-800">
                              <span className="font-medium">{suggestion.document}:</span> {suggestion.suggestion}
                            </p>
                            <p className="text-xs text-orange-600 mt-1">
                              Expected Impact: {suggestion.expected_impact}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Integration Strategy */}
                    {comparison.recommendations.integration_strategy && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <h5 className="font-medium text-blue-700 mb-2">Integration Strategy</h5>
                        <p className="text-sm text-blue-800">{comparison.recommendations.integration_strategy}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2">Upload two documents and compare them to see analysis here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentComparison;
