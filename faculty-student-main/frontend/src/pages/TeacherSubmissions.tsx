import React, { useEffect, useMemo, useState } from 'react';
import documentService from '../services/documentService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import { getQuestionKey, getLegacyQuestionKey } from '../utils/questionKey';

const TeacherSubmissions: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [exams, setExams] = useState<any[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);

  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);
  const [gradingMarks, setGradingMarks] = useState<Record<string, string>>({});
  const [gradingFeedback, setGradingFeedback] = useState<Record<string, string>>({});

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

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentService.listPublishedExams();
      if (response.success) {
        setExams((response.data?.exams || []) as any[]);
      } else {
        setError(response.error || 'Failed to load published exams');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load published exams');
    } finally {
      setLoading(false);
    }
  };

  const loadAttempts = async (examId: number) => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      setSelectedExamId(examId);
      setSelectedAttempt(null);
      const response = await documentService.listTeacherExamAttempts(examId);
      if (response.success) {
        setAttempts((response.data?.attempts || []) as any[]);
      } else {
        setError(response.error || 'Failed to load submissions');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const loadAttemptDetail = async (attemptId: number) => {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);
      const response = await documentService.getTeacherAttempt(attemptId);
      if (response.success) {
        setSelectedAttempt(response.data);
      } else {
        setError(response.error || 'Failed to load attempt');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load attempt');
    } finally {
      setLoading(false);
    }
  };

  const questionsForAttempt = useMemo(() => {
    if (!selectedAttempt?.assignment?.questions) return [];
    const q = selectedAttempt.assignment.questions;
    return Object.entries(q).flatMap(([qType, qList]: any[]) => {
      if (!Array.isArray(qList)) return [];
      return qList.map((item: any) => ({ ...item, type: qType }));
    }).filter((q: any) => {
      // Match StudentExams.tsx filter - only show MCQ and True/False questions
      const qType = String(q.type || '').toLowerCase();
      return qType === 'multiple_choice' || qType === 'true_false';
    });
  }, [selectedAttempt]);

  const gradeQuestion = async (questionKey: string, maxMarks: number) => {
    if (!selectedAttempt) return;
    const raw = gradingMarks[questionKey];
    if (raw === undefined || raw === '') {
      setError('Enter marks before saving grade');
      return;
    }
    const marks = Number(raw);
    if (Number.isNaN(marks)) {
      setError('Invalid marks value');
      return;
    }
    if (marks < 0 || marks > maxMarks) {
      setError(`Marks must be between 0 and ${maxMarks}`);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await documentService.gradeTeacherAttemptAnswer(
        selectedAttempt.attempt_id,
        questionKey,
        marks,
        gradingFeedback[questionKey]
      );
      if (!response.success) {
        setError(response.error || 'Failed to save grade');
        return;
      }
      await loadAttemptDetail(selectedAttempt.attempt_id);
      if (selectedExamId) await loadAttempts(selectedExamId);
      setMessage('Grade saved.');
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
      if (selectedExamId) await loadAttempts(selectedExamId);
      setMessage('Result published to student.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to publish result');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  if (loading && exams.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Submissions</h1>
          <p className="text-gray-600">View submitted answers, grade manually, and publish results.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadExams}>
          Refresh Exams
        </button>
      </div>

      {error && <ErrorMessage message={error} />}
      {message && (
        <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Your Exams</h2>
          {exams.length === 0 ? (
            <p className="text-sm text-gray-500">No published exams yet.</p>
          ) : (
            <div className="space-y-2">
              {exams.map((e) => (
                <button
                  key={e.id}
                  className={`w-full text-left border rounded p-3 ${
                    selectedExamId === e.id ? 'border-primary-400 bg-primary-50' : 'border-gray-200'
                  }`}
                  onClick={() => loadAttempts(e.id)}
                >
                  <p className="font-medium text-gray-900">{e.title}</p>
                  <p className="text-sm text-gray-600 mt-1">Start: {formatIST(e.start_time)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Target: {e.target_branch || 'All'} / Y{e.target_year || 'All'} / {e.target_section || 'All'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Submissions</h2>
            {selectedExamId && (
              <button className="btn btn-secondary" onClick={() => loadAttempts(selectedExamId)}>
                Refresh
              </button>
            )}
          </div>
          {!selectedExamId ? (
            <p className="text-sm text-gray-500">Select an exam to view submissions.</p>
          ) : attempts.length === 0 ? (
            <p className="text-sm text-gray-500">No submissions yet.</p>
          ) : (
            <div className="space-y-2">
              {attempts.map((a) => (
                <div key={a.attempt_id} className="border border-gray-200 rounded p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">{a.student_name}</p>
                      <p className="text-xs text-gray-500">
                        {a.student_roll_number || a.student_email || '-'} | Submitted:{' '}
                        {a.submitted_at ? formatIST(a.submitted_at) : '-'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Score: {a.total_score}/{a.max_score} | Published: {a.result_published ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => loadAttemptDetail(a.attempt_id)}>
                      View Answers
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Manual Evaluation</h2>
          {!selectedAttempt ? (
            <p className="text-sm text-gray-500">Select a submission to view answers.</p>
          ) : (
            <>
              <div className="border border-gray-200 rounded p-3">
                <p className="font-medium text-gray-900">
                  {selectedAttempt.student?.name || 'Student'} ({selectedAttempt.student?.roll_number || selectedAttempt.student?.email || '-'})
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Attempt #{selectedAttempt.attempt_id} | Score: {selectedAttempt.total_score}/{selectedAttempt.max_score} | Status:{' '}
                  {selectedAttempt.grading_status}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Result published: {selectedAttempt.result_published ? 'Yes' : 'No'}
                </p>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {questionsForAttempt.map((q: any, idx: number) => {
                  const qType = String(q.type || 'question').toLowerCase();
                  
                  // Use getQuestionKey for new format, fallback to legacy format
                  const newKey = getQuestionKey(q, q.type, idx);
                  const legacyKey = getLegacyQuestionKey(qType, idx);
                  // Primary key for storing/retrieving answers and grading
                  const questionKey = newKey;
                  
                  const maxMarks = Number(q.marks || 0);
                  const isObjective = qType === 'multiple_choice' || qType === 'true_false';
                  
                  // Backend builds evaluation scores using "type:id" format
                  const rawId = q.id ?? 'None';
                  const scoreEntryKey = `${qType}:${rawId}`;
                  const scoreEntry = selectedAttempt.evaluation?.question_scores?.[scoreEntryKey];
                  
                  // Try to find answer from multiple sources:
                  // 1. From evaluation.question_scores (has graded answer)
                  // 2. From answers dict with new key format
                  // 3. From answers dict with legacy key format
                  const answer = scoreEntry?.student_answer ?? selectedAttempt.answers?.[newKey] ?? selectedAttempt.answers?.[legacyKey];

                  return (
                    <div key={questionKey} className="border border-gray-200 rounded p-3">
                      <p className="text-sm font-medium text-gray-900">
                        Q{idx + 1}. {q.question}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Type: {qType} | Marks: {maxMarks}</p>
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                        <span className="font-medium">Student answer:</span> {answer ? String(answer) : 'No answer'}
                      </p>

                      {scoreEntry && (
                        <p className="text-xs text-green-700 mt-2">
                          Saved: {scoreEntry.awarded_marks}/{scoreEntry.max_marks} ({scoreEntry.mode})
                        </p>
                      )}

                      {!isObjective && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            max={maxMarks}
                            className="input-field"
                            placeholder={`Marks / ${maxMarks}`}
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
                          <button className="btn btn-secondary" onClick={() => gradeQuestion(questionKey, maxMarks)}>
                            Save Grade
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button className="btn btn-primary w-full" onClick={publishResult}>
                Publish Result to Student
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherSubmissions;

