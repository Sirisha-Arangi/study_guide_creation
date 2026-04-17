import React, { useEffect, useState } from 'react';
import documentService from '../services/documentService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';

const StudentResults: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

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

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentService.listStudentResults();
      if (response.success) {
        setResults((response.data?.results || []) as any[]);
      } else {
        setError(response.error || 'Failed to load results');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">View Results</h1>
          <p className="text-gray-600">Results appear only after faculty publishes.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadResults}>
          Refresh
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        {results.length === 0 ? (
          <p className="text-sm text-gray-500">No published results yet.</p>
        ) : (
          <div className="space-y-3">
            {results.map((r) => (
              <div key={r.attempt_id} className="border border-gray-200 rounded p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-900">{r.exam_title}</p>
                  <p className="text-sm text-gray-600">
                    Score: <span className="font-semibold">{r.total_score}</span> / {r.max_score}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Submitted: {r.submitted_at ? formatIST(r.submitted_at) : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Auto: {r.auto_score} | Manual: {r.manual_score} | Status: {r.grading_status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentResults;

