"""
Central app configuration. Reads from environment variables with fallback defaults.
"""
import os
from pathlib import Path

# Load .env manually if python-dotenv or pydantic_settings isn't present
env_file = Path(__file__).resolve().parent.parent.parent / ".env"
if env_file.exists():
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict

    class Settings(BaseSettings):
        model_config = SettingsConfigDict(env_file=".env", extra="ignore")

        APP_NAME: str = "KisanSetu"
        ENV: str = "development"
        DEBUG: bool = True
        DATABASE_URL: str = "sqlite:///./kisansetu.db"
        REDIS_URL: str = "redis://localhost:6379/0"
        SUPABASE_URL: str = ""
        SUPABASE_ANON_KEY: str = ""
        SUPABASE_SERVICE_ROLE_KEY: str = ""
        JWT_SECRET: str = "change-me-in-prod"
        JWT_ALGORITHM: str = "HS256"
        JWT_EXPIRE_MINUTES: int = 60 * 24
        GEMINI_API_KEY: str = ""
        BHASHINI_API_KEY: str = ""
        BHASHINI_USER_ID: str = ""
        BHASHINI_ULCA_API_KEY: str = ""
        AGMARKNET_API_KEY: str = ""
        OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
        OPENROUTESERVICE_API_KEY: str = ""
        RAZORPAY_KEY_ID: str = ""
        RAZORPAY_KEY_SECRET: str = ""
        CORS_ORIGINS: list[str] = ["*"]

    settings = Settings()
except Exception:
    class FallbackSettings:
        APP_NAME = os.getenv("APP_NAME", "KisanSetu")
        ENV = os.getenv("ENV", "development")
        DEBUG = os.getenv("DEBUG", "true").lower() == "true"
        DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kisansetu.db")
        REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        SUPABASE_URL = os.getenv("SUPABASE_URL", "")
        SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
        SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        JWT_SECRET = os.getenv("JWT_SECRET", "change-me-in-prod")
        JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
        JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
        BHASHINI_API_KEY = os.getenv("BHASHINI_API_KEY", "")
        BHASHINI_USER_ID = os.getenv("BHASHINI_USER_ID", "")
        BHASHINI_ULCA_API_KEY = os.getenv("BHASHINI_ULCA_API_KEY", "")
        AGMARKNET_API_KEY = os.getenv("AGMARKNET_API_KEY", "")
        OPEN_METEO_BASE_URL = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1")
        OPENROUTESERVICE_API_KEY = os.getenv("OPENROUTESERVICE_API_KEY", "")
        RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
        RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
        CORS_ORIGINS = ["*"]

    settings = FallbackSettings()
