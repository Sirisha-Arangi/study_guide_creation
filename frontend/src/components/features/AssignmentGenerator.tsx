import React, { useState } from 'react';
import { Document } from '../../types/document';
import documentService from '../../services/documentService';
import FileUpload from '../common/FileUpload';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import { getQuestionKey, getLegacyQuestionKey } from "../../utils/questionKey";

interface AssignmentQuestion {
  id: number;
  type: string;
  difficulty?: string;
  marks: number;
  topic?: string;
  question: string;
  options?: string[];
  correct_answer?: string | boolean;
  explanation?: string;
  sample_answer?: string;
  word_limit?: string;
  guidelines?: string[];
}

interface Assignment {
  title: string;
  description: string;
  total_marks: number;
  difficulty: string;
  duration_hours: number;
  questions: {
    multiple_choice?: AssignmentQuestion[];
    short_answer?: AssignmentQuestion[];
    essay?: AssignmentQuestion[];
    true_false?: AssignmentQuestion[];
  };
  instructions: string;
  evaluation_criteria: string[];
  sources_used: {
    document: boolean;
    web: boolean;
  };
}

const AssignmentGenerator: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [showAnswers, setShowAnswers] = useState<{[key: number]: boolean}>({});
  const [examTitle, setExamTitle] = useState('');
  const [examStartTime, setExamStartTime] = useState('');
  const [examDurationMinutes, setExamDurationMinutes] = useState(60);
  const [targetBranch, setTargetBranch] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [targetSection, setTargetSection] = useState('');
  const [publishMessage, setPublishMessage] = useState<string | null>(null);
  const [publishedExams, setPublishedExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [examAttempts, setExamAttempts] = useState<any[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [gradingMarks, setGradingMarks] = useState<Record<string, string>>({});
  const [gradingFeedback, setGradingFeedback] = useState<Record<string, string>>({});
  const [viewResultsExamId, setViewResultsExamId] = useState<number | null>(null);
  const [studentResults, setStudentResults] = useState<any[]>([]);

  const formatIST = (iso: string | Date) => {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return String(iso);
    }
  };

  // Form states
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [totalMarks, setTotalMarks] = useState(100);
  const [difficultyLevel, setDifficultyLevel] = useState('intermediate');
  const [questionTypes, setQuestionTypes] = useState(['multiple_choice', 'short_answer']);
  const [topics, setTopics] = useState<string[]>(['']);

  const toggleAnswer = (questionId: number) => {
    setShowAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  React.useEffect(() => {
    loadDocuments();
    loadPublishedExams();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await documentService.getDocuments();
      setDocuments(docs);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load documents');
    }
  };

  const loadPublishedExams = async () => {
    try {
      const response = await documentService.listPublishedExams();
      if (response.success) {
        setPublishedExams(response.data?.exams || []);
      }
    } catch (err) {
      // Keep page usable even if this call fails.
    }
  };

  const loadExamAttempts = async (examId: number) => {
    try {
      setError(null);
      setSelectedExamId(examId);
      const response = await documentService.listTeacherExamAttempts(examId);
      if (response.success) {
        setExamAttempts((response.data?.attempts || []) as any[]);
      } else {
        setError(response.error || 'Failed to load submissions');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load submissions');
    }
  };

  const loadAttemptDetail = async (attemptId: number) => {
    try {
      setError(null);
      const response = await documentService.getTeacherAttempt(attemptId);
      if (response.success) {
        setSelectedAttempt(response.data);
      } else {
        setError(response.error || 'Failed to load attempt');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load attempt');
    }
  };

  const gradeQuestion = async (questionId: string) => {
    if (!selectedAttempt) return;
    const raw = gradingMarks[questionId];
    if (raw === undefined || raw === '') {
      setError('Enter marks before grading');
      return;
    }
    const marks = Number(raw);
    if (Number.isNaN(marks)) {
      setError('Invalid marks value');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await documentService.gradeTeacherAttemptAnswer(
        selectedAttempt.attempt_id,
        questionId,
        marks,
        gradingFeedback[questionId]
      );
      if (!response.success) {
        setError(response.error || 'Failed to save grade');
        return;
      }
      await loadAttemptDetail(selectedAttempt.attempt_id);
      if (selectedExamId) await loadExamAttempts(selectedExamId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save grade');
    } finally {
      setLoading(false);
    }
  };

  const publishResult = async () => {
    if (!selectedAttempt) return;
    try {
      setLoading(true);
      setError(null);
      const response = await documentService.publishAttemptResult(selectedAttempt.attempt_id);
      if (!response.success) {
        setError(response.error || 'Failed to publish result');
        return;
      }
      await loadAttemptDetail(selectedAttempt.attempt_id);
      if (selectedExamId) await loadExamAttempts(selectedExamId);
      setPublishMessage('Result published for student.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to publish result');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentResults = async (examId: number) => {
    try {
      setLoading(true);
      setError(null);
      setViewResultsExamId(examId);
      const response = await documentService.getExamStudentResults(examId);
      if (response.success) {
        setStudentResults(response.data?.student_results || []);
      } else {
        setError(response.error || 'Failed to load student results');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load student results');
    } finally {
      setLoading(false);
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

  const handleGenerateAssignment = async () => {
    if (!selectedDocument) {
      setError('Please select a document');
      return;
    }

    if (numberOfQuestions < 1 || numberOfQuestions > 50) {
      setError('Number of questions must be between 1 and 50');
      return;
    }

    if (totalMarks < 10 || totalMarks > 500) {
      setError('Total marks must be between 10 and 500');
      return;
    }

    if (questionTypes.length === 0) {
      setError('Please select at least one question type');
      return;
    }

    const filteredTopics = topics.filter(topic => topic.trim());
    if (filteredTopics.length === 0) {
      setError('Please specify at least one topic');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAssignment(null);

      const request = {
        document_id: selectedDocument.id,
        number_of_questions: numberOfQuestions,
        total_marks: totalMarks,
        difficulty_level: difficultyLevel,
        question_types: questionTypes,
        topics: filteredTopics
      };

      const response = await documentService.generateAssignment(request);
      
      if (response.success && response.data?.assignment) {
        setAssignment(response.data.assignment);
        setExamTitle(response.data.assignment.title || `Exam - ${selectedDocument?.filename || 'Generated Assignment'}`);
      } else {
        setError(response.error || 'Failed to generate assignment');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate assignment');
    } finally {
      setLoading(false);
    }
  };

  const handlePublishExam = async () => {
    if (!assignment) {
      setError('Generate assignment first');
      return;
    }
    if (!examTitle.trim()) {
      setError('Exam title is required');
      return;
    }
    if (!examStartTime) {
      setError('Exam start time is required');
      return;
    }
    if (examDurationMinutes <= 0) {
      setError('Duration must be greater than zero');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setPublishMessage(null);
      const response = await documentService.publishExam({
        title: examTitle.trim(),
        assignment,
        start_time: new Date(examStartTime).toISOString(),
        duration_minutes: examDurationMinutes,
        target_branch: targetBranch || null,
        target_year: targetYear ? parseInt(targetYear, 10) : null,
        target_section: targetSection || null,
      });
      if (response.success) {
        setPublishMessage(`Exam published successfully (ID: ${response.data?.exam_id})`);
        loadPublishedExams();
      } else {
        setError(response.error || 'Failed to publish exam');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to publish exam');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicChange = (index: number, value: string) => {
    const newTopics = [...topics];
    newTopics[index] = value;
    setTopics(newTopics);
  };

  const addTopic = () => {
    setTopics([...topics, '']);
  };

  const removeTopic = (index: number) => {
    if (topics.length > 1) {
      setTopics(topics.filter((_, i) => i !== index));
    }
  };

  const toggleQuestionType = (type: string) => {
    if (questionTypes.includes(type)) {
      setQuestionTypes(questionTypes.filter(t => t !== type));
    } else {
      setQuestionTypes([...questionTypes, type]);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'multiple_choice': return '🔘';
      case 'short_answer': return '📝';
      case 'essay': return '📄';
      case 'true_false': return '✅';
      default: return '❓';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  const isMcqOnlySelected = () => {
    return questionTypes.length === 1 && questionTypes[0] === 'multiple_choice';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assignment Generator</h1>
        <p className="text-gray-600">Generate customized assignment questions based on your document</p>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Configuration */}
        <div className="space-y-6">
          {/* Document Upload/Selection */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Select Document</h2>
            
            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFile={uploadedFile}
              onClearFile={handleClearFile}
              className="mb-4"
            />

            <div className="flex space-x-3 mb-4">
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
                  'Upload Document'
                )}
              </button>
            </div>

            {documents.length > 0 && (
              <div>
                <label htmlFor="document-select" className="block text-sm font-medium text-gray-700 mb-1">
                  Or select existing document:
                </label>
                <select
                  id="document-select"
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
          </div>

          {/* Assignment Parameters */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Assignment Parameters</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="num-questions" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Questions
                  </label>
                  <input
                    id="num-questions"
                    type="number"
                    min="1"
                    max="50"
                    value={numberOfQuestions}
                    onChange={(e) => setNumberOfQuestions(parseInt(e.target.value) || 1)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label htmlFor="total-marks" className="block text-sm font-medium text-gray-700 mb-1">
                    Total Marks
                  </label>
                  <input
                    id="total-marks"
                    type="number"
                    min="10"
                    max="500"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(parseInt(e.target.value) || 10)}
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  Difficulty Level
                </label>
                <select
                  id="difficulty"
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(e.target.value)}
                  className="input-field"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>

          {/* Question Types */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Question Types</h2>
            
            <div className="space-y-2">
              {[
                { value: 'multiple_choice', label: 'Multiple Choice' },
                { value: 'short_answer', label: 'Short Answer' },
                { value: 'essay', label: 'Essay' },
                { value: 'true_false', label: 'True/False' }
              ].map((type) => (
                <label key={type.value} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={questionTypes.includes(type.value)}
                    onChange={() => toggleQuestionType(type.value)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {getQuestionTypeIcon(type.value)} {type.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Topics to Cover</h2>
            
            <div className="space-y-2">
              {topics.map((topic, index) => (
                <div key={index} className="flex space-x-2">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => handleTopicChange(index, e.target.value)}
                    placeholder="Enter topic name"
                    className="input-field flex-1"
                  />
                  {topics.length > 1 && (
                    <button
                      onClick={() => removeTopic(index)}
                      className="btn btn-secondary"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addTopic}
                className="btn btn-secondary w-full"
              >
                Add Topic
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateAssignment}
            disabled={!selectedDocument || loading}
            className="w-full btn btn-primary disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Generating Assignment...
              </div>
            ) : (
              'Generate Assignment'
            )}
          </button>

          {assignment && isMcqOnlySelected() && (
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Publish MCQ Exam</h2>
              <p className="text-sm text-gray-600 mb-4">Only MCQ exams can be published for automatic evaluation</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Title</label>
                  <input
                    type="text"
                    value={examTitle}
                    onChange={(e) => setExamTitle(e.target.value)}
                    className="input-field"
                    placeholder="Midterm - Unit 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={examStartTime}
                    onChange={(e) => setExamStartTime(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min={1}
                    value={examDurationMinutes}
                    onChange={(e) => setExamDurationMinutes(parseInt(e.target.value, 10) || 60)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Branch (optional)</label>
                  <select
                    value={targetBranch}
                    onChange={(e) => setTargetBranch(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All branches</option>
                    {['CSC', 'CSM', 'ECE', 'EEE', 'IT', 'Civil', 'Mechanical'].map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Year (optional)</label>
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All years</option>
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>
                        Year {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Section (optional)</label>
                  <select
                    value={targetSection}
                    onChange={(e) => setTargetSection(e.target.value)}
                    className="input-field"
                  >
                    <option value="">All sections</option>
                    {['A', 'B', 'C', 'D'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <button onClick={handlePublishExam} className="btn btn-primary w-full" disabled={loading}>
                  Publish Exam
                </button>
                {publishMessage && <p className="text-sm text-green-700">{publishMessage}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h2 className="text-lg font-medium text-gray-900">Generated Assignment</h2>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center flex-1">
              <LoadingSpinner size="lg" />
            </div>
          ) : assignment ? (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                {publishedExams.length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Recently Published Exams</h4>
                    <div className="space-y-2">
                      {publishedExams.slice(0, 4).map((exam) => (
                        <div key={exam.id} className="text-sm text-gray-700 flex justify-between">
                          <div className="flex flex-col">
                            <span>
                              {exam.title}
                              {(exam.target_branch || exam.target_year || exam.target_section) && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({exam.target_branch || 'All'} / Y{exam.target_year || 'All'} / {exam.target_section || 'All'})
                                </span>
                              )}
                            </span>
                            <div className="flex gap-2 mt-1">
                              <button
                                className="text-xs text-blue-600 text-left"
                                onClick={() => loadExamAttempts(exam.id)}
                              >
                                View Submissions
                              </button>
                              <button
                                className="text-xs text-green-600 text-left"
                                onClick={() => loadStudentResults(exam.id)}
                              >
                                View Results
                              </button>
                            </div>
                          </div>
                          <span>{formatIST(exam.start_time)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedExamId && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-2">Submissions</h4>
                    {examAttempts.length === 0 ? (
                      <p className="text-sm text-gray-500">No submissions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {examAttempts.map((attempt) => (
                          <div key={attempt.attempt_id} className="flex items-center justify-between text-sm">
                            <span>
                              {attempt.student_name} ({attempt.student_roll_number || attempt.student_email || '-'}) - {attempt.total_score}/{attempt.max_score}
                            </span>
                            <button
                              className="text-blue-600"
                              onClick={() => loadAttemptDetail(attempt.attempt_id)}
                            >
                              Grade
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {selectedAttempt && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-2">
                      Grade Attempt #{selectedAttempt.attempt_id} - {selectedAttempt.student?.name || 'Student'}
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Score: {selectedAttempt.total_score}/{selectedAttempt.max_score} | Status: {selectedAttempt.grading_status}
                    </p>
                    <div className="space-y-3">
                      {Object.entries(selectedAttempt.assignment?.questions || {}).flatMap(([qType, qList]: any[]) => {
                        if (!Array.isArray(qList)) return [];
                        return qList.map((q: any, index: number) => {
                          //const processedQuestion = { ...q, type: qType };
                          const questionType = String(qType || '').toLowerCase();
                          // Apply same filtering as StudentExams.tsx
                          if (questionType !== 'multiple_choice' && questionType !== 'true_false') return null;
                          const processedQuestion = { ...q, type: qType }; // Match StudentExams.tsx processing
                          //const questionType = String(qType || '').toLowerCase();
                          //if (questionType === 'multiple_choice' || questionType === 'true_false') return null;

                          const newKey = getQuestionKey(processedQuestion, qType, index);
                          const legacyKey = getLegacyQuestionKey(qType, index);
                          const questionKey = newKey; // For display
                          const answer = selectedAttempt.answers?.[newKey] ?? selectedAttempt.answers?.[legacyKey];
                          console.log('Faculty side - Question Key:', questionKey, 'Answer:', answer, 'Type:', processedQuestion.type);

                          const itemIndex = index + 1; // display index only (not used for scoring)

                          return (
                            <div key={questionKey} className="border border-gray-100 rounded p-3">
                              <p className="text-sm font-medium text-gray-800">
                                Q{itemIndex}. {processedQuestion.question}
                              </p>
                              
                              {/* MCQ and True/False Answer Display */}
                              {(questionType === 'multiple_choice' || questionType === 'true_false') && processedQuestion.options && (
                                <div className="mt-2 space-y-1">
                                  {processedQuestion.options.map((option: string, optIndex: number) => (
                                    <label key={optIndex} className="flex items-center space-x-2">
                                      <input
                                        type="radio"
                                        checked={answer === option}
                                        disabled
                                        className="rounded border-gray-300 text-blue-600"
                                      />
                                      <span className="text-sm text-gray-700">{option}</span>
                                    </label>
                                  ))}
                                </div>
                              )}

                              {/* Text Answer Display */}
                              {!processedQuestion.options && (
                                <div className="mt-2 p-2 bg-gray-50 rounded border min-h-[60px]">
                                  <p className="text-sm text-gray-800">
                                    {answer || 'No answer provided'}
                                  </p>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                                <input
                                  type="number"
                                  step="0.5"
                                  min={0}
                                  max={processedQuestion.marks || 0}
                                  className="input-field"
                                  placeholder={`Marks / ${processedQuestion.marks || 0}`}
                                  value={gradingMarks[questionKey] ?? ''}
                                  onChange={(e) => setGradingMarks((prev) => ({ ...prev, [questionKey]: e.target.value }))}
                                />
                                <input
                                  type="text"
                                  className="input-field"
                                  placeholder="Feedback (optional)"
                                  value={gradingFeedback[questionKey] ?? ''}
                                  onChange={(e) => setGradingFeedback((prev) => ({ ...prev, [questionKey]: e.target.value }))}
                                />
                                <button className="btn btn-secondary" onClick={() => gradeQuestion(questionKey)}>
                                  Save Grade
                                </button>
                              </div>
                              {scoreEntry && (
                                <p className="text-xs text-green-700 mt-2">
                                  Saved: {scoreEntry.awarded_marks}/{scoreEntry.max_marks}
                                </p>
                              )}
                            </div>
                          );
                        });
                      })}
                    </div>
                    <div className="mt-3">
                      <button className="btn btn-primary w-full" onClick={publishResult}>
                        Publish Result to Student
                      </button>
                    </div>
                  </div>
                )}
                {viewResultsExamId && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-2">
                      Student Results - {publishedExams.find(e => e.id === viewResultsExamId)?.title}
                    </h4>
                    {studentResults.length === 0 ? (
                      <p className="text-sm text-gray-500">No published results yet.</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 mb-2">
                          Total Students: {studentResults.length}
                        </div>
                        {studentResults.map((result) => (
                          <div key={result.attempt_id} className="border border-gray-100 rounded p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-800">
                                  {result.student_name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {result.student_roll_number} | {result.student_branch} | Year {result.student_year} | {result.student_section}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Email: {result.student_email}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold text-blue-600">
                                  {result.total_score}/{result.max_score}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Assignment Preview */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="text-md font-semibold text-gray-800 mb-3">Assignment Preview</h4>
                  
                  {/* Multiple Choice Questions */}
                  {assignment.questions.multiple_choice && assignment.questions.multiple_choice.length > 0 && (
                    <div>
                      <h5 className="text-md font-medium text-gray-700 mb-3">Multiple Choice Questions</h5>
                      <div className="space-y-4">
                        {assignment.questions.multiple_choice.map((question, index) => (
                          <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">MCQ{index + 1}</span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {question.marks} marks
                                </span>
                                {question.difficulty && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                    {question.difficulty}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => toggleAnswer(question.id)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {showAnswers[question.id] ? 'Hide Answer' : 'Show Answer'}
                              </button>
                            </div>
                            <p className="text-gray-800 mb-3">{question.question}</p>
                            {question.options && (
                              <div className="space-y-2">
                                {question.options.map((option: string, optIndex: number) => (
                                  <label key={optIndex} className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      checked={false}
                                      disabled
                                      className="rounded border-gray-300 text-blue-600"
                                    />
                                    <span className="text-sm text-gray-700">{option}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                            {showAnswers[question.id] && question.correct_answer && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                <p className="text-sm font-medium text-green-800">Correct Answer: {question.correct_answer}</p>
                                {question.explanation && (
                                  <p className="text-sm text-green-700 mt-1">{question.explanation}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* True/False Questions */}
                  {assignment.questions.true_false && assignment.questions.true_false.length > 0 && (
                    <div>
                      <h5 className="text-md font-medium text-gray-700 mb-3">True/False Questions</h5>
                      <div className="space-y-4">
                        {assignment.questions.true_false.map((question, index) => (
                          <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">TF{index + 1}</span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {question.marks} marks
                                </span>
                                {question.difficulty && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                    {question.difficulty}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => toggleAnswer(question.id)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {showAnswers[question.id] ? 'Hide Answer' : 'Show Answer'}
                              </button>
                            </div>
                            <p className="text-gray-800 mb-3">{question.question}</p>
                            {question.options && (
                              <div className="space-y-2">
                                {question.options.map((option: string, optIndex: number) => (
                                  <label key={optIndex} className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      checked={false}
                                      disabled
                                      className="rounded border-gray-300 text-blue-600"
                                    />
                                    <span className="text-sm text-gray-700">{option}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                            {showAnswers[question.id] && question.correct_answer !== undefined && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                <p className="text-sm font-medium text-green-800">Correct Answer: {question.correct_answer ? 'True' : 'False'}</p>
                                {question.explanation && (
                                  <p className="text-sm text-green-700 mt-1">{question.explanation}</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Short Answer Questions */}
                  {assignment.questions.short_answer && assignment.questions.short_answer.length > 0 && (
                    <div>
                      <h5 className="text-md font-medium text-gray-700 mb-3">Short Answer Questions</h5>
                      <div className="space-y-4">
                        {assignment.questions.short_answer.map((question, index) => (
                          <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">SA{index + 1}</span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {question.marks} marks
                                </span>
                                {question.word_limit && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {question.word_limit}
                                  </span>
                                )}
                                {question.difficulty && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                    {question.difficulty}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => toggleAnswer(question.id)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {showAnswers[question.id] ? 'Hide Answer' : 'Show Answer'}
                              </button>
                            </div>
                            <p className="text-gray-800 mb-3">{question.question}</p>
                            <textarea
                              rows={3}
                              placeholder="Your answer here..."
                              className="input-field min-h-[90px]"
                            />
                            {showAnswers[question.id] && question.sample_answer && (
                              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                                <p className="text-sm font-medium text-green-800">Sample Answer:</p>
                                <p className="text-sm text-green-700">{question.sample_answer}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Essay Questions */}
                  {assignment.questions.essay && assignment.questions.essay.length > 0 && (
                    <div>
                      <h5 className="text-md font-medium text-gray-700 mb-3">Essay Questions</h5>
                      <div className="space-y-4">
                        {assignment.questions.essay.map((question, index) => (
                          <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">E{index + 1}</span>
                                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {question.marks} marks
                                </span>
                                {question.difficulty && (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                    {question.difficulty}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => toggleAnswer(question.id)}
                                className="text-sm text-blue-600 hover:text-blue-800"
                              >
                                {showAnswers[question.id] ? 'Hide Guidelines' : 'Show Guidelines'}
                              </button>
                            </div>
                            <p className="text-gray-800 mb-3">{question.question}</p>
                            <textarea
                              rows={6}
                              placeholder="Your essay here..."
                              className="input-field min-h-[90px]"
                            />
                            {showAnswers[question.id] && question.guidelines && (
                              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                <p className="text-sm font-medium text-blue-800">Guidelines:</p>
                                <ul className="text-sm text-blue-700 list-disc list-inside">
                                  {question.guidelines.map((guideline, idx) => (
                                    <li key={idx}>{guideline}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 p-4 bg-gray-50 rounded border">
                    <h5 className="text-md font-medium text-gray-700 mb-2">Assignment Details</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Title:</span> {assignment.title}
                      </div>
                      <div>
                        <span className="font-medium">Total Marks:</span> {assignment.total_marks}
                      </div>
                      <div>
                        <span className="font-medium">Difficulty:</span> {assignment.difficulty}
                      </div>
                      <div>
                        <span className="font-medium">Duration:</span> {assignment.duration_hours} hours
                      </div>
                    </div>
                    {assignment.instructions && (
                      <div className="mt-4">
                        <span className="font-medium text-gray-700">Instructions:</span>
                        <p className="text-gray-600 mt-1">{assignment.instructions}</p>
                      </div>
                    )}
                    {assignment.evaluation_criteria && assignment.evaluation_criteria.length > 0 && (
                      <div className="mt-4">
                        <span className="font-medium text-gray-700">Evaluation Criteria:</span>
                        <ul className="list-disc list-inside mt-1 text-gray-600">
                          {assignment.evaluation_criteria.map((criterion, index) => (
                            <li key={index}>{criterion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center flex-1">
              <div className="text-center">
                <p className="text-gray-500 mb-4">No assignment generated yet</p>
                <p className="text-sm text-gray-400">Fill in the form and click "Generate Assignment" to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentGenerator;