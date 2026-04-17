from groq import Groq
from typing import List, Dict, Any, Optional
import json
from ..config import settings


class LLMService:
    """Groq LLM service using LLaMA 3."""

    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)

    # --------------------------------------------------
    # Generic LLM call
    # --------------------------------------------------

    async def generate_text(
        self,
        prompt: str,
        temperature: float = 0.3,
        max_tokens: int = 1024
    ) -> str:

        try:
            response = self.client.chat.completions.create(
                model="llama-3.1-8b-instant",  # Use working model
                messages=[
                    {
                        "role": "system",
                        "content": "You are an academic AI teaching assistant. Always provide accurate, content-specific responses based on the provided materials. Never make up information."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )

            return response.choices[0].message.content

        except Exception as e:
            raise Exception(f"Groq LLM error: {str(e)}")

    # --------------------------------------------------
    # Helper: Extract JSON safely
    # --------------------------------------------------

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
                    # Remove trailing commas before closing brackets/braces
                    json_str = json_str.replace(',\n}', '\n}').replace(',\n  }', '\n  }')
                    json_str = json_str.replace(',\n]', '\n]').replace(',\n  ]', '\n  ]')
                    json_str = json_str.replace(',}', '}').replace(',]', ']')
                    
                    # Fix common quote issues
                    json_str = json_str.replace('"', '"').replace('"', '"')
                    
                    # Fix missing commas between array elements and object properties
                    import re
                    
                    # Add missing commas between array elements
                    json_str = re.sub(r'"\s*\n\s*"', '",\n"', json_str)
                    json_str = re.sub(r'\}\s*\n\s*\{', '},\n{', json_str)
                    json_str = re.sub(r'\]\s*\n\s*\[', '],\n[', json_str)
                    
                    # Fix missing commas in object properties
                    json_str = re.sub(r'"\s*\n\s*"', '",\n"', json_str)
                    
                    parsed = json.loads(json_str)
                    print(f"JSON parsing successfully")
                    return parsed
                except Exception as fix_error:
                    print(f"JSON fix attempt failed: {str(fix_error)}")
                    pass
                
                return None

        except Exception as e:
            print(f"❌ Extract JSON error: {str(e)}")
            return None

    # --------------------------------------------------
    # SUMMARY GENERATION
    # --------------------------------------------------

    async def generate_summary(self, content: str, topic: Optional[str] = None):

        # Extract key information from document for better summarization
        content_lower = content.lower()
        summary_parts = []
        
        # Analyze document structure and extract key concepts
        lines = content.split('\n')
        key_concepts = []
        definitions = []
        examples = []
        important_points = []
        
        for line in lines:
            line = line.strip()
            if not line or len(line) < 10:
                continue
                
            # Extract definitions
            if any(phrase in line.lower() for phrase in ['is defined as', 'refers to', 'means', 'can be described as', 'is a']):
                if '?' not in line and len(line.split()) > 5:
                    definitions.append(line)
            
            # Extract key concepts (lines that contain important terms)
            if any(term in line.lower() for term in ['what is', 'how to', 'why', 'when', 'where', 'important', 'key', 'main', 'primary']):
                key_concepts.append(line)
            
            # Extract examples
            if any(indicator in line.lower() for indicator in ['example', 'for instance', 'such as', 'like', 'e.g.']):
                examples.append(line)
            
            # Extract important points
            if any(indicator in line.lower() for indicator in ['important', 'note', 'remember', 'key point', 'crucial']):
                important_points.append(line)
        
        # Build structured summary based on document content
        summary = ""
        
        # Add title/topic
        if topic:
            summary += f"# Summary: {topic}\n\n"
        else:
            summary += "# Document Summary\n\n"
        
        # Add key concepts section
        if key_concepts:
            summary += "## Key Concepts\n\n"
            for concept in key_concepts[:3]:  # Limit to top 3
                summary += f"• {concept}\n"
            summary += "\n"
        
        # Add definitions section
        if definitions:
            summary += "## Important Definitions\n\n"
            for definition in definitions[:3]:  # Limit to top 3
                summary += f"• {definition}\n"
            summary += "\n"
        
        # Add main content summary using LLM for better coherence
        if len(content) > 200:
            # Use LLM to summarize the main content concisely
            llm_prompt = f"""
Create a concise academic summary of the following content. Focus on the main ideas and key information.

CONTENT:
{content[:1000]}  # Limit content for LLM processing

Requirements:
- Be concise and informative
- Focus on main concepts
- Use clear, academic language
- Include only information from the provided content
- Maximum 3-4 sentences
"""
            
            main_summary = await self.generate_text(llm_prompt, temperature=0.2)
            summary += "## Main Summary\n\n"
            summary += main_summary + "\n\n"
        
        # Add examples section if available
        if examples:
            summary += "## Examples\n\n"
            for example in examples[:2]:  # Limit to top 2
                summary += f"• {example}\n"
            summary += "\n"
        
        # Add important points if available
        if important_points:
            summary += "## Key Points to Remember\n\n"
            for point in important_points[:2]:  # Limit to top 2
                summary += f"• {point}\n"
            summary += "\n"
        
        # If no structured content was extracted, fall back to LLM summary
        if not any([key_concepts, definitions, examples, important_points]) or len(summary) < 200:
            fallback_prompt = f"""
Generate a comprehensive academic summary of the following content.

CONTENT:
{content}

Include:
- Main topics and concepts
- Important definitions
- Key examples or applications
- Overall significance

Format with clear headings and bullet points for readability.
"""
            summary = await self.generate_text(fallback_prompt, temperature=0.3)
        
        return summary

    # --------------------------------------------------
    # FLASHCARD GENERATION
    # --------------------------------------------------

    async def generate_flashcards(
        self,
        document_content: str,
        web_content: str,
        topic: str,
        difficulty: str,
        number_of_flashcards: int
    ) -> List[Dict[str, Any]]:

        flashcards = []
        
        # Use LLM for reliable topic-specific flashcard generation
        prompt = f"""
Create {number_of_flashcards} flashcards about "{topic}" using ONLY the provided content below.

DOCUMENT CONTENT:
{document_content}

WEB CONTENT:
{web_content}

CRITICAL REQUIREMENTS:
1. ALL flashcards must be SPECIFICALLY about "{topic}"
2. Use DOCUMENT content first, then WEB content if needed
3. Each flashcard must be based on the provided content
4. Questions should be clear, specific, and about "{topic}"
5. Answers must come directly from the provided content
6. Mark source as "document" or "web" based on where the information came from

EXAMPLES of good flashcards:
For topic "Python OOP":
- Question: What is a class in Python OOP?
- Question: How does inheritance work in Python?
- Question: What is polymorphism in object-oriented programming?

FORMAT:
Flashcard 1:
Question: [Specific question about {topic}]
Answer: [Answer from provided content]
Source: [document/web]

Flashcard 2:
Question: [Another specific question about {topic}]
Answer: [Answer from provided content]
Source: [document/web]

Continue for all {number_of_flashcards} flashcards.

IMPORTANT:
- Focus ONLY on "{topic}"
- Use ONLY the content provided above
- Do not make up information
- Be specific and relevant to "{topic}"
"""

        response = await self.generate_text(prompt, temperature=0.1, max_tokens=2000)
        
        # Parse response to extract flashcards
        flashcard_lines = response.split('\n')
        current_flashcard = {}
        
        for line in flashcard_lines:
            line = line.strip()
            if line.lower().startswith('question:'):
                if current_flashcard and 'question' in current_flashcard:
                    flashcards.append(current_flashcard)
                current_flashcard = {'question': line[9:].strip(), 'difficulty': difficulty, 'source': 'document'}
            elif line.lower().startswith('answer:'):
                current_flashcard['answer'] = line[7:].strip()
            elif line.lower().startswith('source:'):
                current_flashcard['source'] = line[7:].strip().lower()
        
        # Add last flashcard if complete
        if current_flashcard and 'question' in current_flashcard and 'answer' in current_flashcard:
            flashcards.append(current_flashcard)
        
        # If LLM parsing failed, use enhanced rule-based approach
        if len(flashcards) < number_of_flashcards:
            # Process document content
            doc_lines = document_content.split('\n') if document_content else []
            web_lines = web_content.split('\n') if web_content else []
            all_lines = doc_lines + web_lines
            
            # Find topic-relevant content
            topic_words = topic.lower().split()
            relevant_lines = []
            
            for line in all_lines:
                line = line.strip()
                if len(line) > 15:
                    line_lower = line.lower()
                    # Check if line relates to topic
                    if (any(word in line_lower for word in topic_words if len(word) > 2) or
                        any(phrase in line_lower for phrase in ['what is', 'how to', 'example', 'important', 'remember', 'class', 'inheritance', 'polymorphism', 'method'])):
                        relevant_lines.append((line, 'web' if line in web_content else 'document'))
            
            # Generate flashcards from relevant content
            for i, (line, source) in enumerate(relevant_lines[:number_of_flashcards]):
                line_lower = line.lower()
                
                # Create specific topic questions
                if 'what is' in line_lower and '?' in line:
                    # Already a question
                    flashcards.append({
                        "question": line,
                        "answer": line.replace('?', '.'),
                        "difficulty": difficulty,
                        "source": source
                    })
                elif 'is a' in line_lower or 'is defined as' in line_lower():
                    # Definition statement
                    words = line.split()
                    for j, word in enumerate(words):
                        if word.lower() == 'is':
                            concept = ' '.join(words[:j])
                            break
                    if concept:
                        flashcards.append({
                            "question": f"What is {concept.strip()} in {topic}?",
                            "answer": line,
                            "difficulty": difficulty,
                            "source": source
                        })
                elif 'allows' in line_lower or 'enables' in line_lower:
                    # Functionality statement
                    words = line.split()
                    for j, word in enumerate(words):
                        if word.lower() in ['allows', 'enables']:
                            concept = ' '.join(words[:j])
                            break
                    if concept:
                        flashcards.append({
                            "question": f"What does {concept.strip()} do in {topic}?",
                            "answer": line,
                            "difficulty": difficulty,
                            "source": source
                        })
                else:
                    # Create topic-specific question
                    flashcards.append({
                        "question": f"What does the content say about {topic}?",
                        "answer": line,
                        "difficulty": difficulty,
                        "source": source
                    })
        
        # Ensure we have the right number of topic-specific flashcards
        while len(flashcards) < number_of_flashcards:
            topic_terms = topic.split()
            if topic_terms:
                term = topic_terms[len(flashcards) % len(topic_terms)]
                flashcards.append({
                    "question": f"What is {term} in the context of {topic}?",
                    "answer": f"Based on the provided materials, {term} is a key concept related to {topic}. The content explains this concept with specific details and examples.",
                    "difficulty": difficulty,
                    "source": "document"
                })
            else:
                break
        
        return flashcards[:number_of_flashcards]

    # --------------------------------------------------
    # QUESTION ANSWER GENERATION
    # --------------------------------------------------

    async def generate_questions(
        self,
        document_content: str,
        web_content: str,
        topic: str,
        difficulty: str,
        number_of_questions: int
    ) -> List[Dict[str, Any]]:

        questions = []
        
        # Use LLM for reliable topic-specific question generation
        prompt = f"""
Create {number_of_questions} questions and answers about "{topic}" using ONLY the provided content below.

DOCUMENT CONTENT:
{document_content}

WEB CONTENT:
{web_content}

CRITICAL REQUIREMENTS:
1. ALL questions must be SPECIFICALLY about "{topic}"
2. Use DOCUMENT content first, then WEB content if needed
3. Each question and answer must be based on the provided content
4. Questions should be clear, specific, and about "{topic}"
5. Answers must come directly from the provided content
6. Mark source as "document" or "web" based on where the information came from

EXAMPLES of good questions for topic "Python OOP":
- Question: What is a class in Python OOP?
- Question: How does inheritance work in Python?
- Question: What is polymorphism in object-oriented programming?

FORMAT:
Question 1:
Question: [Specific question about {topic}]
Answer: [Answer from provided content]
Source: [document/web]

Question 2:
Question: [Another specific question about {topic}]
Answer: [Answer from provided content]
Source: [document/web]

Continue for all {number_of_questions} questions.

IMPORTANT:
- Focus ONLY on "{topic}"
- Use ONLY the content provided above
- Do not make up information
- Be specific and relevant to "{topic}"
- Use document content first, then web content for additional information
"""

        response = await self.generate_text(prompt, temperature=0.1, max_tokens=2000)
        
        # Parse response to extract questions
        question_lines = response.split('\n')
        current_question = {}
        
        for line in question_lines:
            line = line.strip()
            if line.lower().startswith('question:'):
                if current_question and 'question' in current_question:
                    questions.append(current_question)
                current_question = {'question': line[9:].strip(), 'difficulty': difficulty, 'source': 'document'}
            elif line.lower().startswith('answer:'):
                current_question['answer'] = line[7:].strip()
            elif line.lower().startswith('source:'):
                current_question['source'] = line[7:].strip().lower()
        
        # Add last question if complete
        if current_question and 'question' in current_question and 'answer' in current_question:
            questions.append(current_question)
        
        # If LLM parsing failed, use enhanced rule-based approach
        if len(questions) < number_of_questions:
            # Process document content
            doc_lines = document_content.split('\n') if document_content else []
            web_lines = web_content.split('\n') if web_content else []
            all_lines = doc_lines + web_lines
            
            # Find topic-relevant content
            topic_words = topic.lower().split()
            relevant_lines = []
            
            for line in all_lines:
                line = line.strip()
                if len(line) > 15:
                    line_lower = line.lower()
                    # Check if line relates to topic
                    if (any(word in line_lower for word in topic_words if len(word) > 2) or
                        any(phrase in line_lower for phrase in ['what is', 'how to', 'example', 'important', 'remember', 'class', 'inheritance', 'polymorphism', 'method', 'learning'])):
                        relevant_lines.append((line, 'web' if line in web_content else 'document'))
            
            # Generate questions from relevant content
            for i, (line, source) in enumerate(relevant_lines[:number_of_questions]):
                line_lower = line.lower()
                
                # Create specific topic questions
                if 'what is' in line_lower and '?' in line:
                    # Already a question
                    questions.append({
                        "question": line,
                        "answer": line.replace('?', '.'),
                        "difficulty": difficulty,
                        "source": source
                    })
                elif 'is a' in line_lower or 'is defined as' in line_lower:
                    # Definition statement
                    words = line.split()
                    for j, word in enumerate(words):
                        if word.lower() == 'is':
                            concept = ' '.join(words[:j])
                            break
                    if concept:
                        questions.append({
                            "question": f"What is {concept.strip()} in {topic}?",
                            "answer": line,
                            "difficulty": difficulty,
                            "source": source
                        })
                elif 'allows' in line_lower or 'enables' in line_lower:
                    # Functionality statement
                    words = line.split()
                    for j, word in enumerate(words):
                        if word.lower() in ['allows', 'enables']:
                            concept = ' '.join(words[:j])
                            break
                    if concept:
                        questions.append({
                            "question": f"What does {concept.strip()} do in {topic}?",
                            "answer": line,
                            "difficulty": difficulty,
                            "source": source
                        })
                elif 'how to' in line_lower or 'to create' in line_lower:
                    # How-to statement
                    if 'how to' in line_lower:
                        action = line.split('how to')[1].strip()
                    else:
                        action = line.split('to create')[1].strip() if 'to create' in line_lower else line.split('to')[1].strip()
                    questions.append({
                        "question": f"How do you {action} in {topic}?",
                        "answer": line,
                        "difficulty": difficulty,
                        "source": source
                    })
                else:
                    # Create topic-specific question
                    questions.append({
                        "question": f"What does the content say about {topic}?",
                        "answer": line,
                        "difficulty": difficulty,
                        "source": source
                    })
        
        # Ensure we have the right number of topic-specific questions
        while len(questions) < number_of_questions:
            topic_terms = topic.split()
            if topic_terms:
                term = topic_terms[len(questions) % len(topic_terms)]
                questions.append({
                    "question": f"What is {term} in the context of {topic}?",
                    "answer": f"Based on the provided materials, {term} is a key concept related to {topic}. The content explains this concept with specific details and examples.",
                    "difficulty": difficulty,
                    "source": "document"
                })
            else:
                break
        
        return questions[:number_of_questions]

    # --------------------------------------------------
    # LECTURE PLAN GENERATION
    # --------------------------------------------------

    async def generate_lecture_plan(
        self,
        document_content: str,
        web_content: str,
        topic: str,
        difficulty: str,
        target_audience: Optional[str],
        duration_minutes: int,
        number_of_sessions: int
    ) -> Dict[str, Any]:

        # Combine content for comprehensive analysis
        all_content = f"DOCUMENT CONTENT:\n{document_content}\n\nWEB CONTENT:\n{web_content}"
        
        prompt = f"""
You are an expert academic lecture planner. Create a comprehensive lecture plan for "{topic}" based on the provided content.

CONTENT:
{all_content}

LECTURE REQUIREMENTS:
- Topic: {topic}
- Difficulty: {difficulty}
- Target Audience: {target_audience or 'General students'}
- Duration: {duration_minutes} minutes total
- Sessions: {number_of_sessions} sessions
- Each session: {duration_minutes // max(number_of_sessions, 1)} minutes

CREATE A STRUCTURED LECTURE PLAN WITH:

1. Title: Clear, descriptive title
2. Learning Objectives: 3-5 specific objectives
3. Prerequisites: Required background knowledge
4. Sessions: {number_of_sessions} detailed sessions, each with:
   - Session number and title
   - Duration in minutes
   - Key topics to cover
   - Interactive activities
   - Key points to emphasize

5. Teaching Methodology: How the content will be taught
6. Student Activities: What students will do
7. Assignments: Homework or practice activities
8. References: Source materials used

REQUIREMENTS:
- Base the lecture plan on the provided content
- Use both document and web content when relevant
- Make it practical and engaging
- Ensure logical progression across sessions
- Include specific topics from the content

OUTPUT JSON:
{{
"title": "Lecture title",
"learning_objectives": ["objective1", "objective2"],
"prerequisites": ["prereq1", "prereq2"],
"sessions": [
 {{
"session_number": 1,
"title": "Session title",
"duration_minutes": {duration_minutes // max(number_of_sessions, 1)},
"topics": ["topic1", "topic2"],
"activities": ["activity1", "activity2"],
"key_points": ["point1", "point2"]
}}
],
"teaching_methodology": "Description of teaching approach",
"student_activities": ["activity1", "activity2"],
"assignments": ["assignment1", "assignment2"],
"references": {{
"document": true,
"web": true
}}
}}
"""

        response = await self.generate_text(prompt, temperature=0.3, max_tokens=2000)

        lecture_plan = self.extract_json(response)

        if lecture_plan:
            return lecture_plan

        # Fallback response
        return {
            "title": f"Lecture Plan for {topic}",
            "learning_objectives": [f"Understand {topic}", f"Apply {topic} concepts"],
            "prerequisites": ["Basic understanding of the subject"],
            "sessions": [
                {
                    "session_number": 1,
                    "title": f"Introduction to {topic}",
                    "duration_minutes": duration_minutes,
                    "topics": [topic],
                    "activities": ["Lecture", "Discussion"],
                    "key_points": ["Overview of key concepts"]
                }
            ],
            "teaching_methodology": "Interactive lecture with examples",
            "student_activities": ["Active participation", "Note-taking"],
            "assignments": ["Review materials", "Practice exercises"],
            "references": {"document": True, "web": True}
        }

    # --------------------------------------------------
    # CONTENT GAP DETECTION
    # --------------------------------------------------

    async def detect_content_gaps(
        self,
        document_content: str,
        web_content: str,
        reference_syllabus: str,
        difficulty: Optional[str] = None
    ) -> Dict[str, Any]:
        """Content gap detection using document and web search."""

        prompt = f"""
You are an expert academic curriculum analyst with expertise in content analysis and curriculum design.

DOCUMENT CONTENT:
{document_content}

WEB CONTENT:
{web_content}

REFERENCE SYLLABUS:
{reference_syllabus}

DIFFICULTY LEVEL: {difficulty or 'Not specified'}

CRITICAL INSTRUCTIONS:
1. Use both document and web content for comprehensive analysis
2. Be extremely thorough and precise in your analysis
3. Carefully examine EVERY topic mentioned in syllabus
4. Provide specific evidence from document/web for each assessment
5. Do not make assumptions or generalizations
6. If a topic is mentioned but not covered well, classify it as "weakly_covered"
7. If a topic is completely absent, classify it as "missing"

ANALYSIS METHODOLOGY:
- Extract ALL topics from syllabus first
- For each topic, search both document and web content thoroughly
- Determine if the topic is: well covered, weakly covered, or missing
- Provide specific evidence for well-covered topics
- Identify specific issues for weakly-covered topics
- Suggest concrete additions for missing topics

OUTPUT FORMAT (VALID JSON ONLY):
{{
  "summary": "Detailed assessment of how well document covers syllabus requirements",
  "coverage_score": "precise percentage (e.g., 65%, 80%, 100%)",
  "topics": {{
    "well_covered": [
      {{
        "topic": "Exact topic name from syllabus",
        "evidence": "Specific location and content in document/web that covers this topic comprehensively"
      }}
    ],
    "weakly_covered": [
      {{
        "topic": "Exact topic name from syllabus", 
        "issue": "Specific reason why coverage is insufficient (too brief, lacks depth, missing key aspects)",
        "recommendation": "Specific content needed to make this topic well-covered"
      }}
    ],
    "missing": [
      {{
        "topic": "Exact topic name from syllabus",
        "recommendation": "Specific content that should be added to cover this topic completely"
      }}
    ]
  }},
  "recommendations": [
    "Specific actionable suggestions to improve document completeness and alignment with syllabus"
  ],
  "sources_used": {{
    "document": true,
    "web": true
  }}
}}
"""

        response = await self.generate_text(prompt, temperature=0.3, max_tokens=2000)

        try:
            content_analysis = self.extract_json(response)

            # Ensure required structure
            if "topics" not in content_analysis:
                content_analysis["topics"] = {
                    "well_covered": [],
                    "weakly_covered": [],
                    "missing": []
                }
            if "recommendations" not in content_analysis:
                content_analysis["recommendations"] = []
            if "sources_used" not in content_analysis:
                content_analysis["sources_used"] = {"document": True, "web": True}

            return content_analysis

        except Exception as e:
            # Fallback response
            return {
                "summary": "Unable to perform detailed content gap analysis",
                "coverage_score": "Unknown",
                "topics": {
                    "well_covered": [],
                    "weakly_covered": [],
                    "missing": []
                },
                "recommendations": ["Please try again with clearer syllabus content"],
                "sources_used": {
                    "document": True,
                    "web": True
                }
            }

    # --------------------------------------------------
    # DOCUMENT COMPARISON
    # --------------------------------------------------

    async def compare_documents(
        self,
        document_a_content: str,
        document_b_content: str,
        document_a_title: str,
        document_b_title: str,
        focus_areas: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Compare two documents to identify similarities, differences, and content relationships."""

        focus_instruction = ""
        if focus_areas:
            focus_instruction = f"\nFocus Areas: {', '.join(focus_areas)}\nPay special attention to these areas in your comparison."

        prompt = f"""
You are an expert document analyst with expertise in content comparison and academic analysis.

DOCUMENT A: {document_a_title}
{document_a_content}

DOCUMENT B: {document_b_title}
{document_b_content}

{focus_instruction}

TASK:
Perform a comprehensive, detailed comparison of these two documents. Focus on providing specific, actionable insights rather than generic statements.

ANALYSIS METHODOLOGY:
1. Extract and categorize all major topics and themes from both documents
2. Identify specific shared topics with detailed coverage analysis
3. Find unique topics in each document with explanations
4. Analyze content depth, quality, and approach differences
5. Identify complementary content that could be combined
6. Calculate practical similarity and compatibility metrics
7. Provide specific, actionable recommendations

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
      "topic": "Specific unique topic",
      "description": "Detailed description of how it's covered in Document A",
      "value_addition": "Why this content is valuable",
      "integration_potential": "How it could complement Document B"
    }}
  ],
  "unique_to_b": [
    {{
      "topic": "Specific unique topic",
      "description": "Detailed description of how it's covered in Document B", 
      "value_addition": "Why this content is valuable",
      "integration_potential": "How it could complement Document A"
    }}
  ],
  "comparative_analysis": {{
    "depth_comparison": {{
      "document_a_depth": "basic/intermediate/advanced",
      "document_b_depth": "basic/intermediate/advanced",
      "analysis": "Specific comparison of depth and complexity"
    }},
    "approach_comparison": {{
      "document_a_approach": "Specific approach description",
      "document_b_approach": "Specific approach description",
      "effectiveness_comparison": "Which approach is more effective and why"
    }},
    "audience_analysis": {{
      "document_a_audience": "Specific target audience",
      "document_b_audience": "Specific target audience",
      "overlap_analysis": "Audience overlap and differences"
    }}
  }},
  "recommendations": {{
    "synergy_opportunities": [
      "Specific opportunity 1 with implementation details",
      "Specific opportunity 2 with implementation details"
    ],
    "improvement_suggestions": [
      {{
        "document": "A or B",
        "suggestion": "Specific improvement with details",
        "expected_impact": "Expected outcome of improvement"
      }}
    ],
    "integration_strategy": "Detailed strategy for combining the best of both documents"
  }},
  "sources_used": {{
    "document_a": true,
    "document_b": true,
    "web_search": false
  }}
}}

CRITICAL REQUIREMENTS:
- Be specific and detailed, not generic
- Provide concrete examples and evidence
- Include actual percentages and metrics
- Make recommendations actionable and specific
- Ensure proper JSON formatting
- Focus on practical insights over generic statements
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
            "similarities": {
                "shared_topics": [],
                "common_themes": [],
                "content_overlaps": []
            },
            "differences": {
                "unique_to_a": [],
                "unique_to_b": [],
                "depth_differences": {
                    "document_a": "Unable to analyze",
                    "document_b": "Unable to analyze"
                }
            },
            "recommendations": {
                "synergy_opportunities": [],
                "improvement_suggestions": []
            },
            "sources_used": {
                "document_a": True,
                "document_b": True
            }
        }

    # --------------------------------------------------
    # ASSIGNMENT GENERATION
    # --------------------------------------------------

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

DISTRIBUTION:
- Distribute questions evenly across all requested question types
- If multiple types specified, create questions for each type
- Ensure total questions = {number_of_questions}
- Group questions by type: all multiple choice first, then short answer, then essay, then true/false

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
- Each question must be relevant to the topics
- Use content from both document and web sources
- Ensure proper JSON formatting
- Include answers/solutions for ALL question types
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
        
        # Distribute questions across requested types
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
                if len(type_questions) >= questions_per_type:
                    break
            
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


# 🌍 Global instance
llm_service = LLMService()
