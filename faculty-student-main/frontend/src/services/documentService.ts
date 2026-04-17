import apiService from './api';
import {
  Document,
  DocumentChunk,
  FeatureResponse,
  ContentGapRequest,
  DocumentComparisonRequest,
  AssignmentGeneratorRequest,
  PublishExamRequest
} from '../types/document';
import {
  SummarizationRequest,
  FlashcardsRequest,
  QARequest,
  LecturePlanRequest
} from '../types/document';

class DocumentService {
  async uploadDocument(file: File): Promise<Document> {
    return await apiService.uploadFile<Document>('/api/documents/upload', file);
  }

  async getDocuments(skip = 0, limit = 50): Promise<Document[]> {
    return await apiService.get<Document[]>('/api/documents/', { skip, limit });
  }

  async getDocument(documentId: number): Promise<Document> {
    return await apiService.get<Document>(`/api/documents/${documentId}`);
  }

  async getDocumentChunks(documentId: number): Promise<DocumentChunk[]> {
    return await apiService.get<DocumentChunk[]>(`/api/documents/${documentId}/chunks`);
  }

  async deleteDocument(documentId: number): Promise<{ message: string }> {
    return await apiService.delete<{ message: string }>(`/api/documents/${documentId}`);
  }

  // Feature endpoints
  async summarizeDocument(request: SummarizationRequest): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>('/api/features/summarization/summarize', request);
  }

  async generateFlashcards(request: FlashcardsRequest): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>('/api/features/flashcards/generate', request);
  }

  async generateQuestions(request: QARequest): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>('/api/features/qa/generate', request);
  }

  async generateLecturePlan(request: LecturePlanRequest): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>('/api/features/lecture-plan/generate', request);
  }

  async detectContentGaps(request: ContentGapRequest): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>('/api/features/content-gap/detect', request);
  }

  async compareDocuments(request: DocumentComparisonRequest): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>('/api/features/document-comparison/compare', request);
  }

  async generateAssignment(request: AssignmentGeneratorRequest): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>('/api/features/assignment-generator/generate', request);
  }

  async publishExam(request: PublishExamRequest): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>('/api/features/assignment-generator/publish', request);
  }

  async listPublishedExams(): Promise<FeatureResponse> {
    return await apiService.get<FeatureResponse>('/api/features/assignment-generator/published');
  }

  async listStudentExams(): Promise<FeatureResponse> {
    return await apiService.get<FeatureResponse>('/api/features/assignment-generator/student/exams');
  }

  async startExam(examId: number): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>(`/api/features/assignment-generator/student/exams/${examId}/start`);
  }

  async getAttempt(attemptId: number): Promise<FeatureResponse> {
    return await apiService.get<FeatureResponse>(`/api/features/assignment-generator/student/attempts/${attemptId}`);
  }

  async saveAnswer(attemptId: number, questionId: string, answer: any): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>(
      `/api/features/assignment-generator/student/attempts/${attemptId}/answer`,
      { question_id: questionId, answer }
    );
  }

  async submitAttempt(attemptId: number, finalAnswers?: Record<string, any>): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>(
      `/api/features/assignment-generator/student/attempts/${attemptId}/submit`,
      { final_answers: finalAnswers || null }
    );
  }

  async getStudentResult(attemptId: number): Promise<FeatureResponse> {
    return await apiService.get<FeatureResponse>(
      `/api/features/assignment-generator/student/attempts/${attemptId}/result`
    );
  }

  async listStudentResults(): Promise<FeatureResponse> {
    return await apiService.get<FeatureResponse>(
      `/api/features/assignment-generator/student/results`
    );
  }

  async listTeacherExamAttempts(examId: number): Promise<FeatureResponse> {
    return await apiService.get<FeatureResponse>(
      `/api/features/assignment-generator/teacher/exams/${examId}/attempts`
    );
  }

  async getTeacherAttempt(attemptId: number): Promise<FeatureResponse> {
    return await apiService.get<FeatureResponse>(
      `/api/features/assignment-generator/teacher/attempts/${attemptId}`
    );
  }

  async gradeTeacherAttemptAnswer(
    attemptId: number,
    questionId: string,
    awardedMarks: number,
    feedback?: string
  ): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>(
      `/api/features/assignment-generator/teacher/attempts/${attemptId}/grade`,
      { question_id: questionId, awarded_marks: awardedMarks, feedback: feedback || null }
    );
  }

  async publishAttemptResult(attemptId: number): Promise<FeatureResponse> {
    return await apiService.post<FeatureResponse>(
      `/api/features/assignment-generator/teacher/attempts/${attemptId}/publish-result`
    );
  }

  async getExamStudentResults(examId: number): Promise<FeatureResponse> {
    return await apiService.get<FeatureResponse>(
      `/api/features/assignment-generator/teacher/exams/${examId}/results`
    );
  }
}

export const documentService = new DocumentService();
export default documentService;
