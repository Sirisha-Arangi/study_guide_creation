# AI Teaching Assistant - Project Structure

## Root Directory Structure
```
ai-teaching/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI app entry point
│   │   ├── config.py          # Configuration settings
│   │   ├── database.py        # Database connections
│   │   ├── models/            # Database models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   └── document.py
│   │   ├── schemas/           # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   └── documents.py
│   │   ├── api/               # API routes
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── documents.py
│   │   │   └── features/
│   │   │       ├── __init__.py
│   │   │       ├── summarization.py
│   │   │       ├── flashcards.py
│   │   │       ├── qa.py
│   │   │       ├── lecture_plan.py
│   │   │       ├── content_gap.py
│   │   │       ├── document_comparison.py
│   │   │       └── assignment.py
│   │   ├── core/              # Core functionality
│   │   │   ├── __init__.py
│   │   │   ├── auth.py        # JWT authentication
│   │   │   ├── security.py    # Password hashing
│   │   │   └── dependencies.py
│   │   ├── services/          # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── rag_service.py # Hybrid RAG implementation
│   │   │   ├── document_processor.py
│   │   │   ├── vector_store.py
│   │   │   └── llm_service.py
│   │   └── utils/             # Utility functions
│   │       ├── __init__.py
│   │       ├── file_handler.py
│   │       └── text_processing.py
│   ├── requirements.txt       # Python dependencies
│   ├── .env                  # Environment variables
│   └── Dockerfile           # Docker configuration
├── frontend/                  # React frontend
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   ├── common/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── FileUpload.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── ErrorMessage.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── RegisterForm.tsx
│   │   │   └── features/
│   │   │       ├── Summarization.tsx
│   │   │       ├── Flashcards.tsx
│   │   │       ├── QA.tsx
│   │   │       ├── LecturePlan.tsx
│   │   │       ├── ContentGap.tsx
│   │   │       ├── DocumentComparison.tsx
│   │   │       └── Assignment.tsx
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── hooks/            # Custom hooks
│   │   │   ├── useAuth.ts
│   │   │   ├── useApi.ts
│   │   │   └── useFileUpload.ts
│   │   ├── services/         # API services
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   └── documentService.ts
│   │   ├── types/            # TypeScript types
│   │   │   ├── auth.ts
│   │   │   ├── document.ts
│   │   │   └── api.ts
│   │   ├── utils/            # Utility functions
│   │   │   ├── constants.ts
│   │   │   ├── helpers.ts
│   │   │   └── validation.ts
│   │   ├── styles/           # CSS/SCSS files
│   │   │   ├── globals.css
│   │   │   └── components.css
│   │   ├── App.tsx           # Main App component
│   │   ├── index.tsx         # Entry point
│   │   └── setupTests.ts     # Test setup
│   ├── package.json          # Node.js dependencies
│   ├── tsconfig.json         # TypeScript configuration
│   ├── tailwind.config.js    # Tailwind CSS config
│   └── Dockerfile           # Docker configuration
├── docs/                     # Documentation
│   ├── api.md               # API documentation
│   ├── deployment.md        # Deployment guide
│   └── user-guide.md        # User guide
├── docker-compose.yml        # Docker Compose configuration
├── .gitignore               # Git ignore file
└── README.md                # Project README
```

## Technology Stack Details

### Backend (FastAPI)
- **FastAPI**: Modern, fast web framework with automatic API docs
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL**: Primary database for user data and metadata
- **ChromaDB**: Vector database for document embeddings
- **OpenAI**: LLM for text generation
- **sentence-transformers**: Text embeddings
- **PyJWT**: JWT authentication
- **bcrypt**: Password hashing
- **python-multipart**: File upload handling
- **PyPDF2/pdfplumber**: PDF processing
- **python-docx**: Document processing

### Frontend (React + TypeScript)
- **React 18**: UI framework with hooks
- **TypeScript**: Type safety
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icons
- **React Hook Form**: Form handling
- **React Query**: Server state management

### Development & Deployment
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **ESLint + Prettier**: Code formatting
- **Jest**: Testing framework

## Key Features Implementation Plan

### 1. Authentication Flow
- JWT-based authentication
- Protected routes
- Session management
- Password security

### 2. Document Processing Pipeline
- File upload and validation
- Text extraction (PDF, TXT, JSON)
- Document chunking
- Vector embedding generation
- Storage in ChromaDB

### 3. Hybrid RAG System
- Document retrieval
- Context augmentation
- LLM generation
- Response formatting

### 4. Feature Modules
Each feature follows the same pattern:
- Document upload
- Feature-specific inputs
- AI processing
- Result display

## Database Schema

### Users Table
- id (PK)
- email (unique)
- password_hash
- name
- department
- created_at
- updated_at

### Documents Table
- id (PK)
- user_id (FK)
- filename
- file_type
- file_size
- content_hash
- upload_date
- metadata (JSON)

### Document Chunks Table
- id (PK)
- document_id (FK)
- chunk_index
- content
- embedding_id
- created_at

## API Endpoints Structure

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout

### Documents
- POST /api/documents/upload
- GET /api/documents/list
- DELETE /api/documents/{id}
- GET /api/documents/{id}/content

### Features
- POST /api/features/summarize
- POST /api/features/flashcards
- POST /api/features/qa
- POST /api/features/lecture-plan
- POST /api/features/content-gap
- POST /api/features/document-comparison
- POST /api/features/assignment
