# AI Teaching Assistant

Generative AI Powered Teaching Assistant for Automated Academic Content Generation and Analysis

## Features

- **Document Processing**: Upload and process academic documents (PDF, TXT, JSON, DOCX)
- **Summarization**: Generate concise summaries of academic content
- **Flashcards**: Create study flashcards with difficulty levels
- **Q&A Generation**: Generate questions and answers (MCQ, Short, Long)
- **Lecture Planning**: Create structured lecture plans
- **Content Gap Detection**: Identify missing topics compared to syllabus
- **Document Comparison**: Compare and analyze differences between documents
- **Assignment Generation**: Create assignments with various question types

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework
- **PostgreSQL**: Primary database
- **ChromaDB**: Vector database for embeddings
- **OpenAI**: LLM for text generation
- **Sentence Transformers**: Text embeddings
- **Hybrid RAG**: Retrieval-Augmented Generation

### Frontend (Coming Soon)
- **React 18**: UI framework
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **React Router**: Navigation

## Quick Start

### Prerequisites
- Docker and Docker Compose
- OpenAI API key

### Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-teaching
```

2. Set up environment variables:
```bash
# Copy the example environment file
cp backend/.env.example backend/.env

# Edit the .env file and add your OpenAI API key
OPENAI_API_KEY=your-openai-api-key-here
```

3. Start the services:
```bash
docker-compose up --build
```

The API will be available at `http://localhost:8000`

### API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new faculty
- `POST /api/auth/login` - Login faculty
- `GET /api/auth/me` - Get current user info

### Documents
- `POST /api/documents/upload` - Upload document
- `GET /api/documents/` - List documents
- `GET /api/documents/{id}` - Get document
- `DELETE /api/documents/{id}` - Delete document

### Features
- `POST /api/features/summarize` - Generate summary
- `POST /api/features/flashcards` - Generate flashcards
- `POST /api/features/questions` - Generate Q&A
- `POST /api/features/lecture-plan` - Generate lecture plan
- `POST /api/features/content-gap` - Detect content gaps
- `POST /api/features/document-comparison` - Compare documents
- `POST /api/features/assignment` - Generate assignment

## Development

### Backend Development

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Run the development server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Architecture

### System Design
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   FastAPI       │    │   ChromaDB      │
│   (Frontend)    │◄──►│   Backend       │◄──►│   Vector Store  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   OpenAI API    │
                       │   (LLM)         │
                       └─────────────────┘
```

### Hybrid RAG Pipeline
1. **Document Ingestion**: Upload and extract text from documents
2. **Text Chunking**: Split documents into manageable chunks
3. **Embedding Generation**: Create vector embeddings using sentence transformers
4. **Vector Storage**: Store embeddings in ChromaDB
5. **Retrieval**: Find relevant chunks based on queries
6. **Generation**: Use LLM to generate responses with retrieved context

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the repository.
