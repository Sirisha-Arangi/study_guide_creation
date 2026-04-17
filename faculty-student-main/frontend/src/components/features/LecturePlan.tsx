import React, { useState } from 'react';
import { Document, LecturePlanRequest, LecturePlan as LecturePlanInterface, Session } from '../../types/document';
import documentService from '../../services/documentService';
import FileUpload from '../common/FileUpload';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const LecturePlan: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lecturePlan, setLecturePlan] = useState<LecturePlanInterface | null>(null);
  const [sourcesUsed, setSourcesUsed] = useState<{ document: boolean; web_search: boolean } | null>(null);
  
  // Form inputs
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [targetAudience, setTargetAudience] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [numberOfSessions, setNumberOfSessions] = useState(1);

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

  const handleGenerateLecturePlan = async () => {
    if (!selectedDocument) {
      setError('Please select or upload a document');
      return;
    }

    if (!topic.trim()) {
      setError('Please enter a topic for the lecture plan');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setLecturePlan(null);
      setSourcesUsed(null);

      const request: LecturePlanRequest = {
        document_id: selectedDocument.id,
        parameters: {},
        topic: topic.trim(),
        difficulty,
        target_audience: targetAudience.trim() || undefined,
        duration_minutes: durationMinutes,
        number_of_sessions: numberOfSessions,
      };

      const response = await documentService.generateLecturePlan(request);
      
      if (response.success && response.data?.lecture_plan) {
        setLecturePlan(response.data.lecture_plan);
        setSourcesUsed(response.data.sources_used);
      } else {
        setError(response.error || 'Failed to generate lecture plan');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate lecture plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lecture Plan Generator</h1>
        <p className="text-gray-600">Generate structured academic lecture plans using documents and web search</p>
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">Lecture Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                  Topic / Course Title *
                </label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Introduction to Machine Learning"
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                  className="input-field"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              <div>
                <label htmlFor="audience" className="block text-sm font-medium text-gray-700 mb-1">
                  Target Audience (Optional)
                </label>
                <input
                  id="audience"
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Computer Science Students"
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <select
                  id="duration"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value))}
                  className="input-field"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div>
                <label htmlFor="sessions" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Sessions
                </label>
                <input
                  id="sessions"
                  type="number"
                  value={numberOfSessions}
                  onChange={(e) => setNumberOfSessions(parseInt(e.target.value) || 1)}
                  min="1"
                  max="10"
                  className="input-field"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateLecturePlan}
              disabled={!selectedDocument || !topic.trim() || loading}
              className="w-full mt-6 btn btn-primary disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Generating Lecture Plan...
                </div>
              ) : (
                'Generate Lecture Plan'
              )}
            </button>
          </div>
        </div>

        {/* Right Column - Output */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-lg font-medium text-gray-900">Generated Lecture Plan</h2>
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
          ) : lecturePlan ? (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                {/* Title */}
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="text-xl font-bold text-gray-900">{lecturePlan.title}</h3>
                </div>

                {/* Learning Objectives */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Learning Objectives</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {lecturePlan.learning_objectives.map((objective, index) => (
                      <li key={index} className="text-gray-700">{objective}</li>
                    ))}
                  </ul>
                </div>

                {/* Prerequisites */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Prerequisites</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {lecturePlan.prerequisites.map((prereq, index) => (
                      <li key={index} className="text-gray-700">{prereq}</li>
                    ))}
                  </ul>
                </div>

                {/* Sessions */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Session-wise Breakdown</h4>
                  <div className="space-y-4">
                    {lecturePlan.sessions.map((session: Session) => (
                      <div key={session.session_number} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">
                            Session {session.session_number}: {session.title}
                          </h5>
                          <span className="text-sm text-gray-500">
                            {session.duration_minutes} minutes
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h6 className="text-sm font-medium text-gray-700 mb-1">Topics</h6>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {session.topics.map((topic, index) => (
                                <li key={index} className="text-gray-600">{topic}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div>
                            <h6 className="text-sm font-medium text-gray-700 mb-1">Activities</h6>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {session.activities.map((activity, index) => (
                                <li key={index} className="text-gray-600">{activity}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div className="mt-3">
                          <h6 className="text-sm font-medium text-gray-700 mb-1">Key Points</h6>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {session.key_points.map((point, index) => (
                              <li key={index} className="text-gray-600">{point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Teaching Methodology */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Teaching Methodology</h4>
                  <p className="text-gray-700">{lecturePlan.teaching_methodology}</p>
                </div>

                {/* Student Activities */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Student Activities</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {lecturePlan.student_activities.map((activity, index) => (
                      <li key={index} className="text-gray-700">{activity}</li>
                    ))}
                  </ul>
                </div>

                {/* Assignments */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Assignments</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {lecturePlan.assignments.map((assignment, index) => (
                      <li key={index} className="text-gray-700">{assignment}</li>
                    ))}
                  </ul>
                </div>

                {/* References */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">References</h4>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className={`px-2 py-1 rounded-full ${
                      lecturePlan.references.document 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      Document: {lecturePlan.references.document ? 'Used' : 'Not Used'}
                    </span>
                    <span className={`px-2 py-1 rounded-full ${
                      lecturePlan.references.web 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      Web: {lecturePlan.references.web ? 'Used' : 'Not Used'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332-.477 4.5-1.253M13 6.253v13C14.168 18.477 15.754 18 17.5 18c1.747 0 3.332-.477 4.5-1.253" />
              </svg>
              <p className="mt-2">Upload a document, enter a topic, and generate a lecture plan to see results here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LecturePlan;
