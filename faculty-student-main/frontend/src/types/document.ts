export interface Document {
  id: number;
  user_id: number;
  filename: string;
  file_type: string;
  file_size: number;
  content_hash: string;
  upload_date: string;
  metadata?: {
    file_path?: string;
    total_text_length?: number;
    num_chunks?: number;
  };
}

export interface DocumentChunk {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  embedding_id?: string;
  created_at: string;
}

export interface FeatureRequest {
  document_id: number;
  parameters: Record<string, any>;
}

export interface FeatureResponse {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

// Feature-specific request types
export interface SummarizationRequest extends FeatureRequest {
  topic_name?: string;
  page_number?: number;
}

export interface FlashcardsRequest extends FeatureRequest {
  topic: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  number_of_flashcards: number;
}

export interface Flashcard {
  question: string;
  answer: string;
  difficulty: string;
  source: 'document' | 'web';
}

export interface QARequest extends FeatureRequest {
  topic: string;
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  number_of_questions: number;
}

export interface QA {
  question: string;
  answer: string;
  difficulty: string;
  source: 'document' | 'web' | 'both';
}

export interface LecturePlanRequest extends FeatureRequest {
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  target_audience?: string;
  duration_minutes: number; // 30, 60, 90
  number_of_sessions: number;
}

export interface LecturePlan {
  title: string;
  learning_objectives: string[];
  prerequisites: string[];
  sessions: Session[];
  teaching_methodology: string;
  student_activities: string[];
  assignments: string[];
  references: {
    document: boolean;
    web: boolean;
  };
}

export interface Session {
  session_number: number;
  title: string;
  duration_minutes: number;
  topics: string[];
  activities: string[];
  key_points: string[];
}

export interface ContentGapRequest extends FeatureRequest {
  reference_syllabus: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export interface ContentAnalysis {
  summary: string;
  coverage_score: string;
  topics: {
    well_covered: TopicCoverage[];
    weakly_covered: TopicCoverage[];
    missing: MissingTopic[];
  };
  recommendations: string[];
  sources_used: {
    document: boolean;
    web: boolean;
  };
}

export interface TopicCoverage {
  topic: string;
  evidence?: string;
  issue?: string;
  recommendation?: string;
}

export interface MissingTopic {
  topic: string;
  recommendation: string;
}

export interface DocumentComparisonRequest {
  document_a_id: number;
  document_b_id: number;
  focus_areas?: string[];
}

export interface DocumentComparison {
  summary: string;
  similarity_analysis: {
    overall_similarity_score: string;
    topic_overlap_percentage: string;
    content_alignment: string;
    complementary_potential: string;
  };
  shared_topics: Array<{
    topic: string;
    coverage_in_a: string;
    coverage_in_b: string;
    similarity_level: string;
    key_points: string[];
  }>;
  unique_to_a: Array<{
    topic: string;
    description: string;
    value_addition: string;
    integration_potential: string;
  }>;
  unique_to_b: Array<{
    topic: string;
    description: string;
    value_addition: string;
    integration_potential: string;
  }>;
  comparative_analysis: {
    depth_comparison: {
      document_a_depth: string;
      document_b_depth: string;
      analysis: string;
    };
    approach_comparison: {
      document_a_approach: string;
      document_b_approach: string;
      effectiveness_comparison: string;
    };
    audience_analysis: {
      document_a_audience: string;
      document_b_audience: string;
      overlap_analysis: string;
    };
  };
  recommendations: {
    synergy_opportunities: string[];
    improvement_suggestions: Array<{
      document: string;
      suggestion: string;
      expected_impact: string;
    }>;
    integration_strategy: string;
  };
  sources_used: {
    document_a: boolean;
    document_b: boolean;
    web_search: boolean;
  };
}

export interface AssignmentGeneratorRequest {
  document_id: number;
  number_of_questions: number;
  total_marks: number;
  difficulty_level: string;
  question_types: string[];
  topics: string[];
  duration_hours?: number;
}

export interface PublishExamRequest {
  title: string;
  assignment: Record<string, any>;
  start_time: string;
  duration_minutes: number;
  target_branch?: string | null;
  target_year?: number | null;
  target_section?: string | null;
}

export interface StudentExam {
  id: number;
  title: string;
  start_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'active' | 'closed';
  target_branch?: string | null;
  target_year?: number | null;
  target_section?: string | null;
  attempt?: {
    id: number;
    status: string;
    started_at: string;
    submitted_at?: string | null;
    total_score?: number;
    max_score?: number;
    result_published?: boolean;
  } | null;
}

export interface ExamAttemptDetail {
  attempt_id: number;
  exam_id: number;
  title: string;
  assignment: Record<string, any>;
  status: string;
  answers: Record<string, any>;
  started_at: string;
  submitted_at?: string | null;
  ends_at: string;
  remaining_seconds: number;
  grading_status?: string;
  result_published?: boolean;
  total_score?: number;
  max_score?: number;
}

export interface AssignmentRequest extends FeatureRequest {
  number_of_questions: number;
  difficulty_levels: string[];
  question_types: string[];
}
