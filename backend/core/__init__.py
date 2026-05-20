import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
load_dotenv(env_path)

class Settings(BaseSettings):
    PROJECT_NAME: str = "ServicePilot AI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Gemini / Vertex AI
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_CLOUD_PROJECT: str = os.getenv("GOOGLE_CLOUD_PROJECT", "servicepilot-production")
    GOOGLE_CLOUD_LOCATION: str = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    VERTEX_MODEL: str = os.getenv("VERTEX_MODEL", "gemini-2.0-flash")
    
    # App
    DEBUG: bool = True

settings = Settings()
