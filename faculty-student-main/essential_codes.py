# ===================================================
# AI TEACHING PLATFORM - ESSENTIAL CODE SECTIONS
# ===================================================

# 1. ASSIGNMENT GENERATOR - LLM SERVICE (llm_service.py)
# ===================================================

async def generate_assignment(
    self,
    document_content: str,
    web_content: str,
    topic: str,
    difficulty: str,
    assignment_type: str,
    duration_hours: Optional[int] = None,
    number_of_questions: int = 5,
    total_marks: int = 50,
    question_types: List[str] = None,
    topics: List[str] = None
) -> Dict[str, Any]:
    
    if question_types is None:
        question_types = ["multiple_choice", "short_answer", "essay", "true_false"]
    
    if topics is None:
        topics = [topic]
        
    # Calculate marks per question type
    marks_per_question = total_marks // number_of_questions if number_of_questions > 0 else 10
    
    # Enhanced prompt for specific, content-based questions
    prompt = f"""
    You are an expert academic assignment designer specializing in creating diverse, content-specific questions.

    TOPICS: {', '.join(topics)}
    DIFFICULTY LEVEL: {difficulty}
    TOTAL QUESTIONS: {number_of_questions}
    TOTAL MARKS: {total_marks}
    QUESTION TYPES: {', '.join(question_types)}

    PRIMARY SOURCE MATERIAL:
    {document_content[:3000]}

    ADDITIONAL REFERENCE MATERIAL:
    {web_content[:2000]}

    TASK:
    Generate {number_of_questions} SPECIFIC, REAL questions based on the ACTUAL document content and web sources provided above. Each question must:

    1. Be DIRECTLY related to the topics and content from the provided materials
    2. Match the difficulty level ({difficulty})
    3. Use SPECIFIC information, examples, and concepts from the document and web sources
    4. Be properly formatted for the question type
    5. Include marks allocation

    CRITICAL REQUIREMENTS:
    - Create REAL questions, not generic templates
    - Extract specific concepts, facts, and topics from the provided content
    - Use actual terminology and examples from the document
    - Make questions test understanding of the specific material provided
    - Avoid generic placeholders like "Clear multiple choice question text"

    OUTPUT FORMAT:
    IMPORTANT: Respond with ONLY valid JSON. No markdown, no explanations, no code blocks.
    Just return the raw JSON object.

    {{
      "title": "Assignment on {', '.join(topics)}",
      "description": "Comprehensive assignment testing understanding of {', '.join(topics)} using both document and web sources",
      "total_marks": {total_marks},
      "difficulty": "{difficulty}",
      "duration_hours": {duration_hours or 2},
      "questions": {{
        "multiple_choice": [
          {{
            "id": 1,
            "question": "Specific multiple choice question based on the document content",
            "options": ["Specific Option A from content", "Specific Option B from content", "Specific Option C from content", "Specific Option D from content"],
            "correct_answer": "Specific correct option from content",
            "marks": {marks_per_question},
            "explanation": "Brief explanation based on the document content"
          }}
        ],
        "short_answer": [
          {{
            "id": 2,
            "question": "Specific short answer question about the document content",
            "sample_answer": "Sample answer based on the document content",
            "marks": {marks_per_question},
            "word_limit": "50-100 words"
          }}
        ],
        "essay": [
          {{
            "id": 3,
            "question": "Essay question requiring detailed analysis of specific concepts from the document",
            "guidelines": ["Specific point 1 from document", "Specific point 2 from document"],
            "marks": {marks_per_question * 2},
            "word_limit": "300-500 words"
          }}
        ],
        "true_false": [
          {{
            "id": 4,
            "question": "Specific true/false statement about the document content",
            "correct_answer": true,
            "marks": {marks_per_question},
            "explanation": "Brief explanation based on the document content"
          }}
        ]
      }},
      "instructions": "Answer all {number_of_questions} questions based on the provided materials. Use both the document and additional research to support your answers.",
      "evaluation_criteria": [
        "Accuracy and understanding of concepts",
        "Critical thinking and analysis",
        "Clarity and organization",
        "Proper use of course materials"
      ],
      "sources_used": {{
        "document": true,
        "web": true
      }}
    }}

    IMPORTANT REMINDERS:
    - Generate EXACTLY {number_of_questions} questions total
    - Group questions by type as shown in the format
    - ONLY include question types that were requested: {question_types}
    - DO NOT include any question types that were not requested
    - CREATE SPECIFIC, REAL QUESTIONS BASED ON THE ACTUAL CONTENT PROVIDED
    - RETURN ONLY RAW JSON - NO MARKDOWN, NO CODE BLOCKS
    """

    response = await self.generate_text(prompt, temperature=0.3, max_tokens=2000)

    try:
        assignment = self.extract_json(response)
        if assignment:
            print(f"✅ Successfully parsed LLM response for assignment generation")
            return assignment
        else:
            print(f"❌ Failed to extract JSON from LLM response")
            print(f"❌ LLM Response: {response[:500]}...")
    except Exception as e:
        print(f"❌ JSON parsing error: {str(e)}")
        print(f"❌ LLM Response: {response[:500]}...")

    # Fallback response with proper question type grouping
    questions_by_type = {}
    question_id = 1
    questions_per_type = max(1, number_of_questions // len(question_types))
    
    for q_type in question_types:
        type_questions = []
        for i in range(min(questions_per_type, number_of_questions - len(type_questions) + 1)):
            if q_type == "multiple_choice":
                type_questions.append({
                    "id": question_id,
                    "question": f"Multiple choice question about {topics[0]}",
                    "options": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "Option A",
                    "marks": marks_per_question,
                    "explanation": "Explanation for the correct answer"
                })
            elif q_type == "true_false":
                type_questions.append({
                    "id": question_id,
                    "question": f"True/False statement about {topics[0]}",
                    "correct_answer": True,
                    "marks": marks_per_question,
                    "explanation": "Explanation for the answer"
                })
            elif q_type == "short_answer":
                type_questions.append({
                    "id": question_id,
                    "question": f"Short answer question about {topics[0]}",
                    "sample_answer": "Sample answer for reference",
                    "marks": marks_per_question,
                    "word_limit": "50-100 words"
                })
            elif q_type == "essay":
                type_questions.append({
                    "id": question_id,
                    "question": f"Essay question requiring detailed analysis of {topics[0]}",
                    "guidelines": [f"Analyze key concepts of {topics[0]}", "Provide examples and evidence"],
                    "marks": marks_per_question * 2,
                    "word_limit": "300-500 words"
                })
            question_id += 1
        
        questions_by_type[q_type] = type_questions

    return {
        "title": f"Assignment on {', '.join(topics)}",
        "description": f"Comprehensive assignment testing understanding of {', '.join(topics)} using both document and web sources",
        "total_marks": total_marks,
        "difficulty": difficulty,
        "duration_hours": duration_hours or 2,
        "questions": questions_by_type,
        "instructions": f"Answer all {number_of_questions} questions based on the provided materials. Use both the document and additional research to support your answers.",
        "evaluation_criteria": [
            "Accuracy and understanding of concepts",
            "Critical thinking and analysis",
            "Clarity and organization",
            "Proper use of course materials"
        ],
        "sources_used": {
            "document": True,
            "web": True
        }
    }

# Enhanced JSON parsing with auto-repair
def extract_json(self, response: str):
    try:
        # Clean up the response
        response = response.strip()
        
        # Remove common LLM response artifacts
        if "```json" in response:
            json_str = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            json_str = response.split("```")[1].strip()
        elif "{" in response:
            # Find the first { and last }
            start = response.find("{")
            end = response.rfind("}") + 1
            if start != -1 and end > start:
                json_str = response[start:end]
            else:
                json_str = response
        else:
            json_str = response
        
        # Try to parse the JSON
        try:
            parsed = json.loads(json_str)
            return parsed
        except json.JSONDecodeError as e:
            print(f"❌ JSON decode error: {e}")
            print(f"❌ JSON string: {json_str[:300]}...")
            
            # Try to fix common JSON issues
            try:
                # Remove trailing commas
                json_str = json_str.replace(',\n}', '\n}').replace(',\n  }', '\n  }')
                # Fix quotes
                json_str = json_str.replace('"', '"').replace('"', '"')
                parsed = json.loads(json_str)
                print(f"✅ Fixed JSON parsing successfully")
                return parsed
            except:
                pass
            
            return None

    except Exception as e:
        print(f"❌ Extract JSON error: {str(e)}")
        return None


# ===================================================
# 2. DOCUMENT COMPARISON - LLM SERVICE
# ===================================================

async def compare_documents(
    self,
    document_a_content: str,
    document_b_content: str,
    document_a_title: str,
    document_b_title: str,
    focus_areas: Optional[List[str]] = None
) -> Dict[str, Any]:
    """Compare two documents to identify similarities, differences, and content relationships."""
    
    prompt = f"""
    You are an expert educational content analyst specializing in comprehensive document comparison and analysis.

    DOCUMENT A: {document_a_title}
    DOCUMENT B: {document_b_title}
    FOCUS AREAS: {', '.join(focus_areas) if focus_areas else 'General comparison'}

    CONTENT OF DOCUMENT A:
    {document_a_content[:3000]}

    CONTENT OF DOCUMENT B:
    {document_b_content[:3000]}

    TASK:
    Provide a comprehensive, structured analysis comparing these two documents. Focus on identifying:
    1. Similarities and overlapping content
    2. Unique contributions of each document
    3. Complementary potential
    4. Specific recommendations for integration

    OUTPUT FORMAT (VALID JSON ONLY):
    {{
      "summary": "Specific, detailed comparison summary highlighting key findings and practical insights",
      "similarity_analysis": {{
        "overall_similarity_score": "0-100%",
        "topic_overlap_percentage": "0-100%",
        "content_alignment": "high/medium/low",
        "complementary_potential": "high/medium/low"
      }},
      "shared_topics": [
        {{
          "topic": "Specific topic name",
          "coverage_in_a": "Detailed coverage description in Document A",
          "coverage_in_b": "Detailed coverage description in Document B",
          "similarity_level": "high/medium/low",
          "key_points": ["Specific point 1", "Specific point 2"]
        }}
      ],
      "unique_to_a": [
        {{
          "topic": "Specific topic unique to Document A",
          "description": "Detailed description of the unique content",
          "value_addition": "How this content adds value",
          "integration_potential": "How this could be integrated with Document B"
        }}
      ],
      "unique_to_b": [
        {{
          "topic": "Specific topic unique to Document B",
          "description": "Detailed description of the unique content",
          "value_addition": "How this content adds value",
          "integration_potential": "How this could be integrated with Document A"
        }}
      ],
      "comparative_analysis": {{
        "depth_comparison": {{
          "document_a_depth": "Analysis of Document A's depth",
          "document_b_depth": "Analysis of Document B's depth",
          "analysis": "Comparative analysis of depth differences"
        }},
        "approach_comparison": {{
          "document_a_approach": "Document A's approach/style",
          "document_b_approach": "Document B's approach/style",
          "effectiveness_comparison": "Comparison of effectiveness"
        }},
        "audience_analysis": {{
          "document_a_audience": "Target audience for Document A",
          "document_b_audience": "Target audience for Document B",
          "overlap_analysis": "Analysis of audience overlap"
        }}
      }},
      "recommendations": {{
        "synergy_opportunities": [
          {{
            "opportunity": "Specific synergy opportunity",
            "implementation_details": "How to implement this synergy"
          }}
        ],
        "improvement_suggestions": [
          {{
            "document": "Document A or B",
            "suggestion": "Specific improvement suggestion",
            "expected_impact": "High/Medium/Low impact description"
          }}
        ],
        "integration_strategy": "Detailed strategy for integrating both documents"
      }},
      "sources_used": {{
        "document_a": true,
        "document_b": true,
        "web_search": false
      }}
    }}

    IMPORTANT:
    - Provide specific, detailed analysis based on actual content
    - Include concrete examples and quotes where relevant
    - Focus on actionable insights and recommendations
    - Ensure all sections are filled with meaningful content
    - Return ONLY valid JSON without markdown formatting
    """

    response = await self.generate_text(prompt, temperature=0.3, max_tokens=2000)

    try:
        comparison = self.extract_json(response)
        if comparison:
            return comparison
    except Exception:
        pass

    # Fallback response
    return {
        "summary": f"Comparison between {document_a_title} and {document_b_title}",
        "similarity_analysis": {
            "overall_similarity_score": "50%",
            "topic_overlap_percentage": "40%",
            "content_alignment": "medium",
            "complementary_potential": "medium"
        },
        "shared_topics": [],
        "unique_to_a": [],
        "unique_to_b": [],
        "comparative_analysis": {
            "depth_comparison": {
                "document_a_depth": "Unable to analyze",
                "document_b_depth": "Unable to analyze",
                "analysis": "Analysis not available"
            },
            "approach_comparison": {
                "document_a_approach": "Unable to determine",
                "document_b_approach": "Unable to determine",
                "effectiveness_comparison": "Comparison not available"
            },
            "audience_analysis": {
                "document_a_audience": "Unable to determine",
                "document_b_audience": "Unable to determine",
                "overlap_analysis": "Analysis not available"
            }
        },
        "recommendations": {
            "synergy_opportunities": [],
            "improvement_suggestions": [],
            "integration_strategy": "Integration strategy not available"
        },
        "sources_used": {
            "document_a": True,
            "document_b": True,
            "web_search": False
        }
    }


# ===================================================
# 3. FRONTEND - ASSIGNMENT GENERATOR COMPONENT
# ===================================================

import React, { useState } from 'react';
import { Document } from '../../types/document';
import documentService from '../../services/documentService';

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
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [totalMarks, setTotalMarks] = useState(50);
  const [difficultyLevel, setDifficultyLevel] = useState('intermediate');
  const [questionTypes, setQuestionTypes] = useState<string[]>(['multiple_choice', 'short_answer']);
  const [topics, setTopics] = useState<string[]>(['']);
  const [loading, setLoading] = useState(false);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<{[key: number]: boolean}>({});

  const toggleAnswer = (questionId: number) => {
    setShowAnswers(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleGenerateAssignment = async () => {
    if (!selectedDocument) {
      setError('Please select a document');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filteredTopics = topics.filter(topic => topic.trim() !== '');
      
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
      } else {
        setError(response.error || 'Failed to generate assignment');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to generate assignment');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Assignment Generator</h1>
      
      {/* Form Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Document Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Document
            </label>
            <select
              value={selectedDocument?.id || ''}
              onChange={(e) => {
                const doc = documents.find(d => d.id === parseInt(e.target.value));
                setSelectedDocument(doc || null);
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Choose a document...</option>
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.filename}</option>
              ))}
            </select>
          </div>

          {/* Number of Questions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Questions
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={numberOfQuestions}
              onChange={(e) => setNumberOfQuestions(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {/* Total Marks */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Marks
            </label>
            <input
              type="number"
              min="10"
              max="1000"
              value={totalMarks}
              onChange={(e) => setTotalMarks(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>

          {/* Difficulty Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level
            </label>
            <select
              value={difficultyLevel}
              onChange={(e) => setDifficultyLevel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="easy">Easy</option>
              <option value="intermediate">Intermediate</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* Question Types */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Question Types
          </label>
          <div className="space-x-4">
            {['multiple_choice', 'short_answer', 'essay', 'true_false'].map(type => (
              <label key={type} className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={questionTypes.includes(type)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setQuestionTypes([...questionTypes, type]);
                    } else {
                      setQuestionTypes(questionTypes.filter(t => t !== type));
                    }
                  }}
                  className="mr-2"
                />
                {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
              </label>
            ))}
          </div>
        </div>

        {/* Topics */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topics
          </label>
          {topics.map((topic, index) => (
            <div key={index} className="flex space-x-2 mb-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => {
                  const newTopics = [...topics];
                  newTopics[index] = e.target.value;
                  setTopics(newTopics);
                }}
                placeholder="Enter topic"
                className="flex-1 border border-gray-300 rounded-md px-3 py-2"
              />
              {topics.length > 1 && (
                <button
                  onClick={() => {
                    setTopics(topics.filter((_, i) => i !== index));
                  }}
                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => setTopics([...topics, ''])}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Add Topic
          </button>
        </div>

        {/* Generate Button */}
        <div className="mt-6">
          <button
            onClick={handleGenerateAssignment}
            disabled={loading || !selectedDocument}
            className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? 'Generating...' : 'Generate Assignment'}
          </button>
        </div>
      </div>

      {/* Assignment Display */}
      {assignment && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{assignment.title}</h2>
            <p className="text-gray-600 mb-4">{assignment.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <span className="text-sm text-blue-600 font-medium">Total Marks</span>
                <p className="text-lg font-bold text-blue-900">{assignment.total_marks}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <span className="text-sm text-green-600 font-medium">Difficulty</span>
                <p className={`text-lg font-bold ${getDifficultyColor(assignment.difficulty)}`}>
                  {assignment.difficulty.charAt(0).toUpperCase() + assignment.difficulty.slice(1)}
                </p>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <span className="text-sm text-purple-600 font-medium">Duration</span>
                <p className="text-lg font-bold text-purple-900">{assignment.duration_hours} hours</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Instructions</h3>
              <p className="text-gray-700">{assignment.instructions}</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Evaluation Criteria</h3>
              <ul className="list-disc list-inside text-gray-700">
                {assignment.evaluation_criteria.map((criteria, index) => (
                  <li key={index}>{criteria}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Questions by Type */}
          <div className="space-y-8">
            {assignment.questions.multiple_choice && assignment.questions.multiple_choice.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Multiple Choice Questions</h3>
                <div className="space-y-4">
                  {assignment.questions.multiple_choice.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">
                        {index + 1}. {question.question}
                      </h5>
                      {question.options && (
                        <div className="space-y-2 ml-4">
                          {question.options.map((option, optIndex) => (
                            <label key={optIndex} className="flex items-center space-x-2">
                              <input type="radio" name={`mc-${question.id}`} />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      )}
                      <button 
                        onClick={() => toggleAnswer(question.id)}
                        className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {showAnswers[question.id] ? 'Hide Answer' : 'Show Answer'}
                      </button>
                      {showAnswers[question.id] && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                          <strong>Answer:</strong> {question.correct_answer}
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

            {assignment.questions.short_answer && assignment.questions.short_answer.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Short Answer Questions</h3>
                <div className="space-y-4">
                  {assignment.questions.short_answer.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">
                        {index + 1}. {question.question}
                      </h5>
                      {question.word_limit && (
                        <p className="text-sm text-gray-600 mb-2">Word limit: {question.word_limit}</p>
                      )}
                      <button 
                        onClick={() => toggleAnswer(question.id)}
                        className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {showAnswers[question.id] ? 'Hide Sample Answer' : 'Show Sample Answer'}
                      </button>
                      {showAnswers[question.id] && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                          <strong>Sample Answer:</strong> {question.sample_answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {assignment.questions.essay && assignment.questions.essay.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Essay Questions</h3>
                <div className="space-y-4">
                  {assignment.questions.essay.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">
                        {index + 1}. {question.question}
                      </h5>
                      {question.word_limit && (
                        <p className="text-sm text-gray-600 mb-2">Word limit: {question.word_limit}</p>
                      )}
                      {question.guidelines && question.guidelines.length > 0 && (
                        <div className="mb-2">
                          <p className="text-sm font-medium text-gray-700">Guidelines:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
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

            {assignment.questions.true_false && assignment.questions.true_false.length > 0 && (
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">True/False Questions</h3>
                <div className="space-y-4">
                  {assignment.questions.true_false.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">
                        {index + 1}. {question.question}
                      </h5>
                      <button 
                        onClick={() => toggleAnswer(question.id)}
                        className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        {showAnswers[question.id] ? 'Hide Answer' : 'Show Answer'}
                      </button>
                      {showAnswers[question.id] && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                          <strong>Answer:</strong> {question.correct_answer ? 'True' : 'False'}
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
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
};

export default AssignmentGenerator;
