import React, { useEffect, useMemo, useRef, useState } from 'react';
import documentService from '../services/documentService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { StudentExam, ExamAttemptDetail } from '../types/document';
import { getQuestionKey } from '../utils/questionKey';

const StudentExams: React.FC = () => {
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [examModeMessage, setExamModeMessage] = useState<string | null>(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [displayRemaining, setDisplayRemaining] = useState<number>(0);

  const answersRef = useRef<Record<string, any>>({});
  const autoSubmittedRef = useRef(false);

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

  const isRestrictedOpenResponseType = (type: unknown) => {
    const t = String(type ?? '').toLowerCase().trim();
    // Enforce no copy/paste for free-text questions.
    return t === 'essay' || t === 'short_answer' || t === 'short answer' || t === 'short-answer';
  };

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'hidden') {
        setExamModeMessage('Tab switch detected. Your exam is being submitted automatically.');
        await submitExam(true);
      }
    };

    const handleWindowBlur = async () => {
      setExamModeMessage('Window focus lost. Your exam is being submitted automatically.');
      await submitExam(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [attempt?.attempt_id, attempt?.status, answers]);

  useEffect(() => {
    const updateFullscreenState = () => {
      setFullscreenActive(!!document.fullscreenElement);
    };
    updateFullscreenState();
    document.addEventListener('fullscreenchange', updateFullscreenState);
    return () => document.removeEventListener('fullscreenchange', updateFullscreenState);
  }, []);

  const timerText = useMemo(() => {
    const minutes = Math.floor(displayRemaining / 60);
    const seconds = displayRemaining % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [displayRemaining]);

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentService.listStudentExams();
      if (response.success) {
        setExams((response.data?.exams || []) as StudentExam[]);
      } else {
        setError(response.error || 'Failed to load exams');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const refreshAttempt = async (attemptId: number) => {
    try {
      const response = await documentService.getAttempt(attemptId);
      if (response.success) {
        const nextAttempt = response.data as ExamAttemptDetail;
        setAttempt(nextAttempt);
        setAnswers(nextAttempt.answers || {});
        setResultMessage(null);
      } else {
        setError(response.error || 'Failed to refresh attempt');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to refresh attempt');
    }
  };

  const startExam = async (examId: number) => {
    try {
      setLoading(true);
      setError(null);
      const started = await documentService.startExam(examId);
      if (!started.success || !started.data?.attempt_id) {
        setError(started.error || 'Could not start exam');
        return;
      }
      await refreshAttempt(started.data.attempt_id);
      await loadExams();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not start exam');
    } finally {
      setLoading(false);
    }
  };

  const saveAnswer = async (questionId: string, value: any) => {
    if (!attempt) return;
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    try {
      await documentService.saveAnswer(attempt.attempt_id, questionId, value);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save answer');
    }
  };

  const submitExam = async (silent = false) => {
    if (!attempt) return;
    autoSubmittedRef.current = true;
    try {
      setSubmitting(true);
      const response = await documentService.submitAttempt(attempt.attempt_id, answersRef.current);
      if (response.success) {
        await refreshAttempt(attempt.attempt_id);
        await loadExams();
      } else {
        if (!silent) setError(response.error || 'Submit failed');
      }
    } catch (err: any) {
      if (!silent) setError(err.response?.data?.detail || 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!attempt || attempt.status !== 'in_progress') return;
    autoSubmittedRef.current = false;
    setDisplayRemaining(attempt.remaining_seconds ?? 0);

    const id = window.setInterval(() => {
      setDisplayRemaining((prev) => {
        if (prev <= 1) {
          if (!autoSubmittedRef.current) {
            autoSubmittedRef.current = true;
            submitExam(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
    // We intentionally don't depend on `answers` to keep the countdown stable.
  }, [attempt?.attempt_id, attempt?.status]);

  // Results are visible from the dedicated "View Results" page after faculty publishes.

  const requestFullscreen = async () => {
    try {
      const root = document.documentElement as any;
      if (root.requestFullscreen) {
        await root.requestFullscreen();
      }
      setExamModeMessage('Exam mode enabled. Do not switch tabs or windows.');
    } catch {
      setExamModeMessage('Fullscreen was blocked by browser. Please allow fullscreen for exam mode.');
    }
  };

  if (loading && exams.length === 0) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  const groupedQuestions: any[] = attempt?.assignment?.questions
    ? Object.entries(attempt.assignment.questions).flatMap(([qType, qList]) => {
        if (!Array.isArray(qList)) return [];
        return qList.map((q: any) => ({ ...q, type: qType }));
      }).filter((q: any) => {
        // For MCQ-only exams, only show MCQ and True/False questions
        const qType = String(q.type || '').toLowerCase();
        return qType === 'multiple_choice' || qType === 'true_false';
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Exams</h1>
        <p className="text-gray-600">Start when exam window opens. Auto-submit occurs when timer ends.</p>
      </div>

      {error && <ErrorMessage message={error} />}
      {examModeMessage && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm">
          {examModeMessage}
        </div>
      )}
      {resultMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded text-sm">
          {resultMessage}
        </div>
      )}

      {!attempt && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-lg font-semibold mb-3">Available Exams</h2>
          {exams.length === 0 ? (
            <p className="text-sm text-gray-500">No exams published yet.</p>
          ) : (
            <div className="space-y-3">
              {exams.map((exam) => (
                <div key={exam.id} className="border border-gray-200 rounded p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{exam.title}</p>
                    <p className="text-sm text-gray-600">
                      Start: {formatIST(exam.start_time)} | Duration: {exam.duration_minutes} min
                    </p>
                    <p className="text-xs uppercase text-gray-500 mt-1">Status: {exam.status}</p>
                  </div>
                  <button
                    className="btn btn-primary disabled:opacity-50"
                    disabled={exam.status !== 'active' || exam.attempt?.status === 'submitted' || exam.attempt?.status === 'auto_submitted'}
                    onClick={() => {
                      // Request fullscreen in the same click gesture.
                      requestFullscreen();
                      startExam(exam.id);
                    }}
                  >
                    {exam.attempt ? 'Resume' : 'Start'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {attempt && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
          {!fullscreenActive && attempt.status === 'in_progress' && (
            <div className="flex justify-end">
              <button className="btn btn-secondary" onClick={requestFullscreen}>
                Enter Full Screen
              </button>
            </div>
          )}
          {attempt.status === 'in_progress' && !fullscreenActive && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded text-sm">
              Fullscreen is required to start the exam. Click <span className="font-semibold">Enter Full Screen</span>.
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{attempt.title}</h2>
              <p className="text-sm text-gray-500">Status: {attempt.status}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Time Remaining</p>
              <p className={`text-2xl font-bold ${displayRemaining < 60 ? 'text-red-600' : 'text-blue-600'}`}>{timerText}</p>
            </div>
          </div>

          {groupedQuestions.length === 0 ? (
            <p className="text-sm text-gray-500">No questions found.</p>
          ) : (
            <div className="space-y-4">
              {groupedQuestions.map((q: any, index: number) => {
                const globalIndex = index; // This is already the filtered index
                //const rawId = q.id ?? `q${index}`;
                //const questionKey = `${String(q.type ?? 'question').toLowerCase()}:${rawId}`;
                
                //console.log('Student side - Question Key:', questionKey, 'Raw ID:', rawId, 'Type:', q.type);
                const questionKey = getQuestionKey(q, q.type, index);
                const qType = String(q.type || '').toLowerCase();
                
                return (
                  <div key={questionKey} className="border border-gray-200 rounded p-3">
                    <p className="font-medium text-gray-800 mb-2">Q{globalIndex + 1}. {q.question}</p>
                    
                    {qType === 'multiple_choice' && q.options ? (
                      <div className="space-y-2">
                        {q.options.map((option: string, optIndex: number) => (
                          <label key={optIndex} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name={questionKey}
                              value={option}
                              checked={answers[questionKey] === option}
                              onChange={(e) => saveAnswer(questionKey, e.target.value)}
                              disabled={attempt.status !== 'in_progress' || !fullscreenActive}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : qType === 'true_false' ? (
                      <div className="space-y-2">
                        {['True', 'False'].map((option) => (
                          <label key={option} className="flex items-center space-x-2 cursor-pointer">
                            <input
                              type="radio"
                              name={questionKey}
                              value={option}
                              checked={answers[questionKey] === option}
                              onChange={(e) => saveAnswer(questionKey, e.target.value)}
                              disabled={attempt.status !== 'in_progress' || !fullscreenActive}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        className="input-field min-h-[90px]"
                        value={answers[questionKey] ?? ''}
                        onChange={(e) => saveAnswer(questionKey, e.target.value)}
                        disabled={attempt.status !== 'in_progress' || !fullscreenActive}
                        placeholder="Write your answer"
                        onCopy={(e) => {
                          if (isRestrictedOpenResponseType(q.type)) e.preventDefault();
                        }}
                        onPaste={(e) => {
                          if (isRestrictedOpenResponseType(q.type)) e.preventDefault();
                        }}
                        onCut={(e) => {
                          if (isRestrictedOpenResponseType(q.type)) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          if (isRestrictedOpenResponseType(q.type)) e.preventDefault();
                        }}
                        onKeyDown={(e) => {
                          if (!isRestrictedOpenResponseType(q.type)) return;
                          // Block common clipboard shortcuts.
                          if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
                            e.preventDefault();
                          }
                        }}
                        onContextMenu={(e) => {
                          if (isRestrictedOpenResponseType(q.type)) e.preventDefault();
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3">
            <button
              className="btn btn-primary disabled:opacity-50"
              onClick={() => submitExam()}
              disabled={attempt.status !== 'in_progress' || submitting || !fullscreenActive}
            >
              {submitting ? 'Submitting...' : 'Submit Exam'}
            </button>
            <button className="btn btn-secondary" onClick={() => setAttempt(null)}>
              Back to Exam List
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentExams;
