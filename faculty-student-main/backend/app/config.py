from pydantic_settings import BaseSettings
from typing import List, Optional


class Settings(BaseSettings):
    # ======================
    # Application
    # ======================
    app_name: str = "AI Teaching Assistant"
    app_version: str = "1.0.0"
    debug: bool = True

    # ======================
    # Database
    # ======================
    database_url: str

    # ======================
    # Security / JWT
    # ======================
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    # ======================
    # LLM Configuration (Groq)
    # ======================
    llm_provider: str = "groq"
    groq_api_key: str

    # ======================
    # Web RAG (Tavily)
    # ======================
    tavily_api_key: Optional[str] = None
    enable_web_rag: bool = True

    # ======================
    # Vector DB (Chroma)
    # ======================
    chroma_db_path: str = "./chroma_db"

    # ======================
    # File Upload
    # ======================
    max_file_size: str = "50MB"
    allowed_file_types: str = "txt,pdf,json,docx"

    # ======================
    # CORS
    # ======================
    allowed_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    class Config:
        env_file = ".env"
        extra = "forbid"  # 🔒 Prevents silent env mistakes (VERY GOOD)

    # ======================
    # Helpers
    # ======================
    @property
    def allowed_origins_list(self) -> List[str]:
        if self.allowed_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.allowed_origins.split(",")]

    @property
    def allowed_file_types_list(self) -> List[str]:
        return [file_type.strip() for file_type in self.allowed_file_types.split(",")]


settings = Settings()
