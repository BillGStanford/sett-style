"""SETT API — Configuration management."""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        # Ignore NEXT_PUBLIC_ vars if accidentally present in .env
        extra="ignore",
    )

    environment: str = "development"
    debug: bool = False
    secret_key: str = ""

    # Database
    database_url: str = "postgresql://postgres@localhost:5432/sett-db"
    db_pool_min_size: int = 2
    db_pool_max_size: int = 10

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 7

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_key: str = ""
    supabase_jwt_secret: str = ""

    # Cloudflare R2
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "sett-media"
    r2_public_url: str = "https://media.sett.style"

    # Email
    resend_api_key: str = ""
    email_from: str = "noreply@sett.style"

    # Affiliate
    shareasale_affiliate_id: str = ""
    shareasale_api_token: str = ""
    cj_website_id: str = ""
    cj_api_key: str = ""
    amazon_associates_tag: str = ""

    # Stripe
    stripe_secret_key: str = ""
    stripe_pro_price_id: str = ""
    stripe_webhook_secret: str = ""

    # Observability
    sentry_dsn: str = ""
    log_level: str = "INFO"

    # CORS — typed as str so pydantic-settings v2.7+ does NOT
    # attempt json.loads() on it (which crashes on comma-separated values).
    # The @property below exposes it as List[str].
    cors_origins_raw: str = "http://localhost:3000,https://sett.style,https://www.sett.style"

    @property
    def cors_origins(self) -> List[str]:
        """Parse CORS_ORIGINS from comma-separated or JSON array format."""
        v = self.cors_origins_raw.strip().replace("\r\n", "\n").replace("\r", "")
        if not v:
            return ["http://localhost:3000"]
        # JSON array: ["http://...","http://..."]
        if v.startswith("["):
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed if str(o).strip()]
            except json.JSONDecodeError:
                pass
        # Comma-separated
        return [o.strip() for o in v.split(",") if o.strip()]


settings = Settings()