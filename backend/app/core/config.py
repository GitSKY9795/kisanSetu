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
        # Firebase SQL Connect (Data Connect) Cloud SQL instance, "project:region:instance".
        # When set, the backend connects to it through the Cloud SQL connector instead of DATABASE_URL.
        CLOUD_SQL_INSTANCE: str = ""
        DB_NAME: str = "kisansetu"
        DB_USER: str = ""
        DB_PASSWORD: str = ""
        FIREBASE_PROJECT_ID: str = ""
        GOOGLE_APPLICATION_CREDENTIALS: str = ""
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
        CLOUD_SQL_INSTANCE = os.getenv("CLOUD_SQL_INSTANCE", "")
        DB_NAME = os.getenv("DB_NAME", "kisansetu")
        DB_USER = os.getenv("DB_USER", "")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "")
        FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "")
        GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")
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

# Google client libraries prefer GOOGLE_API_KEY when both names exist. Keep it
# aligned with the explicitly configured Gemini key so an inherited stale key
# cannot silently power the assistant.
if settings.GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
