import React, { useState } from 'react';
import { Document, QARequest, QA as QAInterface } from '../../types/document';
import documentService from '../../services/documentService';
import FileUpload from '../common/FileUpload';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const QA: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QAInterface[]>([]);
  const [sourcesUsed, setSourcesUsed] = useState<{ document: boolean; web_search: boolean } | null>(null);
  
  // Form inputs
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Moderate' | 'Hard'>('Moderate');
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);

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

  const handleGenerateQuestions = async () => {
    if (!selectedDocument) {
      setError('Please select or upload a document');
      return;
    }

    if (!topic.trim()) {
      setError('Please enter a topic for questions');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setQuestions([]);
      setSourcesUsed(null);

      const request: QARequest = {
        document_id: selectedDocument.id,
        parameters: {},
        topic: topic.trim(),
        difficulty,
        number_of_questions: numberOfQuestions,
      };

      const response = await documentService.generateQuestions(request);
      
      if (response.success && response.data?.questions) {
        setQuestions(response.data.questions);
        setSourcesUsed(response.data.sources_used);
      } else {
        setError(response.error || 'Failed to generate questions');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'Easy': return 'bg-green-100 text-green-800';
      case 'Moderate': return 'bg-yellow-100 text-yellow-800';
      case 'Hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'document': return 'bg-blue-100 text-blue-800';
      case 'web': return 'bg-green-100 text-green-800';
      case 'both': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Question & Answer</h1>
        <p className="text-gray-600">Generate academic Q&A pairs using documents and web search</p>
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Q&A Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                  Topic / Focus Area *
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., objects in C++ (object creation, object behavior, object lifecycle ONLY)"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Be specific about the focus area for better results
                </p>
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'Easy' | 'Moderate' | 'Hard')}
                  className="input-field"
                >
                  <option value="Easy">Easy</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div>
                <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Questions
                </label>
                <input
                  id="number"
                  type="number"
                  value={numberOfQuestions}
                  onChange={(e) => setNumberOfQuestions(parseInt(e.target.value) || 1)}
                  min="1"
                  max="20"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum 20 questions per request
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateQuestions}
              disabled={!selectedDocument || !topic.trim() || loading}
              className="w-full mt-6 btn btn-primary disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating Questions...
                </div>
              ) : (
                'Generate Questions'
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Output */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-lg font-medium text-gray-900">Generated Questions & Answers</h2>
            {sourcesUsed && (
              <div className="flex items-center space-x-2 text-xs">
                {sourcesUsed.document && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                    Document
                  </span>
                )}
                {sourcesUsed.web_search && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    Web Search
                  </span>
                )}
              </div>
            )}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <LoadingSpinner size="lg" />
            </div>
          ) : questions.length > 0 ? (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {questions.map((qa, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Q&A {index + 1}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSourceColor(qa.source)}`}>
                        {qa.source}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(qa.difficulty)}`}>
                        {qa.difficulty}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-.554.554-1.485.038-2.341-.066-2.91-.059-2.715-.019-3.402-.077-3.402-.771 0-1.336.492-1.336 1.336 0 .568.194 1.336.492.768.771 1.336 1.336 0 .688-.276 1.336-.768 1.336-1.336 0-.568-.194-1.336-.492-.768-.771-1.336-1.336z" />
                      </svg>
                      Question:
                    </div>
                    <div className="text-gray-900 font-medium">{qa.question}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2v-4m0 6v6m0-6V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
                      </svg>
                      Answer:
                    </div>
                    <div className="text-gray-800">{qa.answer}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-.554.554-1.485.038-2.341-.066-2.91-.059-2.715-.019-3.402-.077-3.402-.771 0-1.336.492-1.336 1.336 0 .568.194 1.336.492.768.771 1.336 1.336 0 .688-.276 1.336-.768 1.336-1.336 0-.568-.194-1.336-.492-.768-.771-1.336-1.336z" />
              </svg>
              <p className="mt-2">Upload a document, enter a topic, and generate questions to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QA; 