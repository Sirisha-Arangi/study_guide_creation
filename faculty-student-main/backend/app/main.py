from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text
from .config import settings
from .database import engine, get_db
from .database import Base
from .api import auth, documents, features
from .core.dependencies import get_current_active_user

# Create database tables
Base.metadata.create_all(bind=engine)


def _run_safe_schema_sync():
    inspector = inspect(engine)
    if "users" in inspector.get_table_names():
        columns = [col["name"] for col in inspector.get_columns("users")]
        with engine.begin() as connection:
            dialect = engine.dialect.name

            if "role" not in columns:
                if dialect == "sqlite":
                    connection.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR DEFAULT 'teacher' NOT NULL"))
                else:
                    connection.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR"))
                    connection.execute(text("UPDATE users SET role = 'teacher' WHERE role IS NULL"))
                    connection.execute(text("ALTER TABLE users ALTER COLUMN role SET NOT NULL"))

            if "branch" not in columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN branch VARCHAR"))

            if "year" not in columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN year INTEGER"))

            if "section" not in columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN section VARCHAR"))

            if "roll_number" not in columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN roll_number VARCHAR"))

    if "exams" in inspector.get_table_names():
        exam_columns = [col["name"] for col in inspector.get_columns("exams")]
        with engine.begin() as connection:
            if "target_branch" not in exam_columns:
                connection.execute(text("ALTER TABLE exams ADD COLUMN target_branch VARCHAR"))
            if "target_year" not in exam_columns:
                connection.execute(text("ALTER TABLE exams ADD COLUMN target_year INTEGER"))
            if "target_section" not in exam_columns:
                connection.execute(text("ALTER TABLE exams ADD COLUMN target_section VARCHAR"))

    if "exam_attempts" in inspector.get_table_names():
        attempt_columns = [col["name"] for col in inspector.get_columns("exam_attempts")]
        with engine.begin() as connection:
            if "auto_score" not in attempt_columns:
                connection.execute(text("ALTER TABLE exam_attempts ADD COLUMN auto_score INTEGER DEFAULT 0 NOT NULL"))
            if "manual_score" not in attempt_columns:
                connection.execute(text("ALTER TABLE exam_attempts ADD COLUMN manual_score INTEGER DEFAULT 0 NOT NULL"))
            if "total_score" not in attempt_columns:
                connection.execute(text("ALTER TABLE exam_attempts ADD COLUMN total_score INTEGER DEFAULT 0 NOT NULL"))
            if "max_score" not in attempt_columns:
                connection.execute(text("ALTER TABLE exam_attempts ADD COLUMN max_score INTEGER DEFAULT 0 NOT NULL"))
            if "grading_status" not in attempt_columns:
                connection.execute(text("ALTER TABLE exam_attempts ADD COLUMN grading_status VARCHAR DEFAULT 'not_submitted' NOT NULL"))
            if "result_published" not in attempt_columns:
                connection.execute(text("ALTER TABLE exam_attempts ADD COLUMN result_published BOOLEAN DEFAULT 0 NOT NULL"))
            if "evaluation" not in attempt_columns:
                connection.execute(text("ALTER TABLE exam_attempts ADD COLUMN evaluation JSON"))

            # Normalize legacy values for result_published (older versions stored strings).
            if "result_published" in attempt_columns:
                connection.execute(
                    text(
                        """
                        UPDATE exam_attempts
                        SET result_published = CASE
                          WHEN result_published IS NULL THEN 0
                          WHEN LOWER(CAST(result_published AS TEXT)) IN ('1','true','yes','y') THEN 1
                          ELSE 0
                        END
                        """
                    )
                )


_run_safe_schema_sync()

# Initialize FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI Teaching Assistant - Automated Academic Content Generation and Analysis"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(features.router, prefix="/api/features", tags=["Features"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI Teaching Assistant API",
        "version": settings.app_version,
        "status": "active"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": settings.app_version
    }


@app.get("/api/me")
async def get_current_user_info(current_user = Depends(get_current_active_user)):
    """Get current user information."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "department": current_user.department,
        "role": current_user.role,
        "is_active": current_user.is_active
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
