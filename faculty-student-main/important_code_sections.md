# Important Code Sections for A4 Paper

## 1. Assignment Generator - Core Implementation

### Backend: Enhanced LLM Service (llm_service.py)

```python
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
    
    # Enhanced prompt for specific, content-based questions
    prompt = f"""
    You are an expert academic assignment designer specializing in creating diverse, content-specific questions.
    
    TASK: Generate {number_of_questions} SPECIFIC, REAL questions based on the ACTUAL document content.
    
    CRITICAL REQUIREMENTS:
    - Create REAL questions, not generic templates
    - Extract specific concepts, facts, and topics from the provided content
    - Use actual terminology and examples from the document
    - Make questions test understanding of the specific material provided
    """
    
    # Robust JSON parsing with error handling
    def extract_json(self, response: str):
        try:
            response = response.strip()
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0].strip()
            elif "{" in response:
                start = response.find("{")
                end = response.rfind("}") + 1
                json_str = response[start:end]
            else:
                json_str = response
            
            parsed = json.loads(json_str)
            return parsed
        except json.JSONDecodeError as e:
            # Auto-fix common JSON issues
            json_str = json_str.replace(',\n}', '\n}').replace(',\n  }', '\n  }')
            parsed = json.loads(json_str)
            return parsed
```

### Frontend: React Component with Type Safety (AssignmentGenerator.tsx)

```typescript
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

// Safe rendering with type checking
{assignment.questions.multiple_choice?.map((question, index) => (
  <div key={question.id} className="mb-6">
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
```

## 2. Document Comparison - Enhanced Error Handling

### Backend: Structured Comparison Response

```python
async def compare_documents(
    self,
    document_a_content: str,
    document_b_content: str,
    document_a_title: str,
    document_b_title: str,
    focus_areas: Optional[List[str]] = None
) -> Dict[str, Any]:
    
    prompt = f"""
    Generate a comprehensive document comparison with the following structure:
    
    {{
      "summary": "Detailed comparison summary",
      "similarity_analysis": {{
        "overall_similarity_score": "85%",
        "topic_overlap_percentage": "75%",
        "content_alignment": "high",
        "complementary_potential": "medium"
      }},
      "shared_topics": [
        {{
          "topic": "Specific topic name",
          "coverage_in_a": "Detailed coverage in Document A",
          "coverage_in_b": "Detailed coverage in Document B",
          "similarity_level": "high",
          "key_points": ["Point 1", "Point 2"]
        }}
      ],
      "recommendations": {{
        "synergy_opportunities": [
          {{
            "opportunity": "Specific opportunity description",
            "implementation_details": "How to implement"
          }}
        ],
        "improvement_suggestions": [
          {{
            "document": "Document A",
            "suggestion": "Specific improvement",
            "expected_impact": "High/Medium/Low"
          }}
        ],
        "integration_strategy": "Detailed integration approach"
      }}
    }}
    """
```

### Frontend: Safe Object Rendering (DocumentComparison.tsx)

```typescript
// Type-safe similarity color function
const getSimilarityColor = (score: string | undefined) => {
  if (!score) return 'bg-gray-100 text-gray-800';
  
  const numScore = parseInt(score.replace('%', ''));
  if (isNaN(numScore)) return 'bg-gray-100 text-gray-800';
  
  if (numScore >= 80) return 'bg-green-100 text-green-800';
  if (numScore >= 50) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

// Safe object rendering with type checking
{comparison.recommendations.synergy_opportunities?.map((recommendation: any, index: number) => (
  <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
    <p className="text-sm text-yellow-800">
      {typeof recommendation === 'string' 
        ? recommendation 
        : recommendation.opportunity || 'Recommendation'}
    </p>
    {recommendation.implementation_details && (
      <p className="text-xs text-yellow-600 mt-1">
        Details: {recommendation.implementation_details}
      </p>
    )}
  </div>
))}
```

## 3. Database Models & API Integration

### SQLAlchemy Models (document.py)

```python
class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_hash = Column(String, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    doc_metadata = Column(JSON, nullable=True)
    
    # Relationship with chunks
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    embedding = Column(Vector, nullable=True)  # For vector search
    
    # Relationship back to document
    document = relationship("Document", back_populates="chunks")
```

### FastAPI Endpoints (assignment_generator.py)

```python
@router.post("/generate", response_model=FeatureResponse)
async def generate_assignment(
    request: AssignmentGeneratorRequest,
    current_user: User = Depends(get_current_active_user)
):
    try:
        # Get document content with RAG
        document_content = await rag_service.get_relevant_content(
            request.document_id, 
            request.topics, 
            current_user.id
        )
        
        # Get web search content
        web_content = ""
        if settings.enable_web_rag:
            web_content = await web_search_service.search_academic_content(
                request.topics, 
                request.difficulty_level
            )
        
        # Generate assignment
        assignment = await llm_service.generate_assignment(
            document_content=document_content,
            web_content=web_content,
            topic=request.topics[0] if request.topics else "General",
            difficulty=request.difficulty_level,
            assignment_type="mixed",
            duration_hours=request.duration_hours,
            number_of_questions=request.number_of_questions,
            total_marks=request.total_marks,
            question_types=request.question_types,
            topics=request.topics
        )
        
        return FeatureResponse(
            success=True,
            data={"assignment": assignment},
            message="Assignment generated successfully"
        )
        
    except Exception as e:
        logger.error(f"Assignment generation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate assignment: {str(e)}"
        )
```

## 4. Authentication & Security

### JWT Token Management (security.py)

```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.JWTError:
        return None

# Enhanced dependency with better error messages
async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(token)
        if payload is None:
            raise credentials_exception
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401, 
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=401, 
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=401, 
            detail="User account is inactive"
        )
    
    return user
```

## 5. Frontend Architecture & State Management

### React Context for Authentication (AuthContext.tsx)

```typescript
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
  token: string | null;
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      if (response.success) {
        setToken(response.data.access_token);
        setUser(response.data.user);
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, token }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### API Service with Error Handling (api.ts)

```typescript
class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: 'http://127.0.0.1:8000',
      timeout: 30000,
    });

    // Request interceptor for authentication
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle token expiration gracefully
          localStorage.removeItem('access_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
}
```

## 6. Key Technical Innovations

### 1. Enhanced JSON Parsing with Auto-Repair
- Automatically fixes common JSON syntax errors
- Handles malformed LLM responses
- Provides fallback mechanisms

### 2. Type-Safe React Components
- Comprehensive TypeScript interfaces
- Runtime type checking
- Safe object rendering

### 3. RAG-Based Content Retrieval
- Vector similarity search
- Context-aware content extraction
- Efficient document chunking

### 4. Multi-Modal Assignment Generation
- Supports 4 question types (MCQ, T/F, Essay, Short Answer)
- Content-based question generation
- Difficulty and topic customization

### 5. Robust Error Handling
- Graceful degradation
- User-friendly error messages
- Comprehensive logging

## 7. Performance Optimizations

### Database Indexing
```python
# Vector indexing for similarity search
index = VectorIndex(
    dimensions=1536,
    algorithm=VectorIndexAlgorithm.HNSW,
    space=VectorSpace.COSINE
)
```

### Frontend Caching
```typescript
// React Query for data caching
import { useQuery } from 'react-query';

const { data: documents, isLoading } = useQuery(
  'documents',
  () => documentService.getDocuments(),
  {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  }
);
```

## 8. Security Best Practices

### Input Validation
```python
from pydantic import BaseModel, validator
import re

class AssignmentGeneratorRequest(BaseModel):
    document_id: int
    number_of_questions: int = Field(ge=1, le=50)
    total_marks: int = Field(ge=10, le=1000)
    difficulty_level: str = Field(regex="^(easy|intermediate|hard)$")
    question_types: List[str] = Field(min_items=1)
    topics: List[str] = Field(min_items=1)
    
    @validator('topics')
    def validate_topics(cls, v):
        if not v or not all(topic.strip() for topic in v):
            raise ValueError('Topics cannot be empty')
        return v
```

### CORS Configuration
```python
# FastAPI CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Summary

This code represents a production-ready AI teaching platform with:

1. **Robust Backend**: FastAPI with SQLAlchemy, RAG, and LLM integration
2. **Type-Safe Frontend**: React with TypeScript, comprehensive error handling
3. **Advanced Features**: Assignment generation, document comparison, vector search
4. **Security**: JWT authentication, input validation, CORS
5. **Performance**: Caching, indexing, optimized queries
6. **Scalability**: Modular architecture, microservice-ready design

The platform demonstrates modern full-stack development practices with AI/ML integration.
