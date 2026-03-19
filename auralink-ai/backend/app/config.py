"""Application configuration from environment."""
from pathlib import Path

from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import List

# Load .env from backend directory so it works regardless of cwd
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Settings loaded from env (e.g. .env)."""

    # API
    app_name: str = "SyncLyst"
    debug: bool = False

    # CORS: comma-separated list of allowed origins (e.g. https://app.example.com,https://www.example.com)
    # If empty, defaults to ["*"] for development. Set in production for security.
    cors_origins: str = ""

    # Vision: one of "gemini" | "openai"
    vision_provider: str = "gemini"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    # Force dummy extraction even if keys exist (local dev safety switch).
    force_dummy_vision: bool = False

    # Web enrichment: after image extraction, use Gemini + Google Search to fetch exact
    # product name and full listing details from the web (optional; requires Gemini key).
    enable_web_enrichment: bool = True

    @field_validator("gemini_api_key", "openai_api_key", mode="before")
    @classmethod
    def strip_api_key(cls, v):
        if isinstance(v, str):
            return v.strip()
        return v or ""

    # OCR (Google Cloud Vision for label text)
    gcp_vision_credentials_json: str = ""

    # Database (Supabase)
    supabase_url: str = ""
    supabase_service_key: str = ""

    # Redis (for Celery)
    redis_url: str = "redis://localhost:6379/0"

    # Clerk (JWT verification)
    clerk_publishable_key: str = ""
    clerk_secret_key: str = ""
    clerk_jwks_url: str = "https://api.clerk.com/v1/jwks"  # Override if needed

    # Shopify OAuth (Partner Dashboard app credentials)
    shopify_client_id: str = ""
    shopify_client_secret: str = ""
    app_base_url: str = "http://localhost:8000"  # Backend URL for OAuth redirect_uri
    frontend_url: str = "http://localhost:3000"  # Redirect after OAuth success

    # Optional: known brands DB (path or URL) for logo → brand mapping
    brands_db_path: str = ""

    # Integrations: webhook secret for listing-published (optional)
    integrations_webhook_secret: str = ""

    # Stripe billing
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_pro: str = ""
    stripe_price_growth: str = ""
    stripe_price_scale: str = ""
    stripe_customer_portal_return_url: str = ""

    def get_cors_origins_list(self) -> List[str]:
        """Return CORS origins as a list. Empty or '*' means allow all.
        Local dev origins are always included so the dashboard on localhost can connect."""
        local_origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
        if not self.cors_origins or self.cors_origins.strip() == "*":
            return ["*"]
        origins = [o.strip() for o in self.cors_origins.split(",") if o.strip()]
        for o in local_origins:
            if o not in origins:
                origins.append(o)
        return origins

    class Config:
        env_file = str(_ENV_FILE) if _ENV_FILE.exists() else ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
