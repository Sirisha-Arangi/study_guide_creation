import React, { useState } from 'react';
import { Document, FlashcardsRequest, Flashcard } from '../../types/document';
import documentService from '../../services/documentService';
import FileUpload from '../common/FileUpload';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const Flashcards: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [sourcesUsed, setSourcesUsed] = useState<{ document: boolean; web_search: boolean } | null>(null);
  
  // Form inputs
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Easy' | 'Moderate' | 'Hard'>('Moderate');
  const [numberOfFlashcards, setNumberOfFlashcards] = useState(5);

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

  const handleGenerateFlashcards = async () => {
    if (!selectedDocument) {
      setError('Please select or upload a document');
      return;
    }

    if (!topic.trim()) {
      setError('Please enter a topic for flashcards');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setFlashcards([]);
      setSourcesUsed(null);

      const request: FlashcardsRequest = {
        document_id: selectedDocument.id,
        parameters: {},
        topic: topic.trim(),
        difficulty,
        number_of_flashcards: numberOfFlashcards,
      };

      const response = await documentService.generateFlashcards(request);
      
      if (response.success && response.data?.flashcards) {
        setFlashcards(response.data.flashcards);
        setSourcesUsed(response.data.sources_used);
      } else {
        setError(response.error || 'Failed to generate flashcards');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate flashcards');
    } finally {
      setLoading(false);
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'document': return 'bg-blue-100 text-blue-800';
      case 'web': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Academic Flashcards</h1>
        <p className="text-gray-600">Generate study flashcards using documents and web search</p>
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Flashcard Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                  Topic for Flashcards *
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Machine Learning, Photosynthesis"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the specific topic you want flashcards for
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
                  Number of Flashcards
                </label>
                <input
                  id="number"
                  type="number"
                  value={numberOfFlashcards}
                  onChange={(e) => setNumberOfFlashcards(parseInt(e.target.value) || 1)}
                  min="1"
                  max="20"
                  className="input-field"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum 20 flashcards per request
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerateFlashcards}
              disabled={!selectedDocument || !topic.trim() || loading}
              className="w-full mt-6 btn btn-primary disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating Flashcards...
                </div>
              ) : (
                'Generate Flashcards'
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Output */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-lg font-medium text-gray-900">Generated Flashcards</h2>
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
          ) : flashcards.length > 0 ? (
            <div className="space-y-4 flex-1 overflow-y-auto">
              {flashcards.map((flashcard, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">Card {index + 1}</span>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getSourceColor(flashcard.source)}`}>
                        {flashcard.source}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(flashcard.difficulty)}`}>
                        {flashcard.difficulty}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <div className="text-sm font-medium text-gray-700 mb-1">Question:</div>
                    <div className="text-gray-900">{flashcard.question}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Answer:</div>
                    <div className="text-gray-800">{flashcard.answer}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="mt-2">Upload a document, enter a topic, and generate flashcards to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Flashcards;
