"""
Centralized application configuration.
All values are sourced from environment variables (see .env.example).
Never hardcode production secrets here.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Digital Bank Locker Management Platform"
    ENV: str = "development"
    DEBUG: bool = True

    # Database
    # Defaults to a local SQLite file so the project runs with zero extra
    # installs. Set DATABASE_URL in .env to a postgresql+psycopg2://... URL
    # to use real PostgreSQL instead (e.g. for production or Docker Compose).
    DATABASE_URL: str = "sqlite:///./locker.db"

    # Redis
    # If REDIS_URL is unreachable, app/core/redis_client.py automatically
    # falls back to an in-memory substitute — no Redis/Memurai install
    # required for local/demo use. Set REDIS_URL in .env to use real Redis.
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    JWT_SECRET_KEY: str = "CHANGE_ME_DEV_ONLY_NOT_FOR_PRODUCTION"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Verification tokens (dual-control)
    VERIFICATION_TOKEN_TTL_SECONDS: int = 300  # 5 minutes
    VERIFICATION_TOKEN_MAX_ATTEMPTS: int = 3

    # Rate limiting
    OTP_RATE_LIMIT_PER_MINUTE: int = 5

    # Face verification
    AI_MODE: str = "real"                        # "mock" | "real"
    FACE_VERIFICATION_REQUIRED: bool = True
    FACE_CONFIDENCE_THRESHOLD: float = 0.70
    MAX_FACE_ATTEMPTS: int = 100
    FACE_RATE_LIMIT_PER_MINUTE: int = 120        # per-user sliding window
    MAX_IMAGE_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    FACE_DISTANCE_THRESHOLD: float = 0.50       # dlib Euclidean face distance cutoff
    EMBEDDINGS_DIR: str = "data/embeddings"      # Registered face embeddings storage
    MOCK_FACE_RESULT: str = "pass"               # pass | low_confidence | liveness_fail | no_match

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
