from typing import Literal

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""

    # API Settings
    app_name: str = "LLM Tournament API"
    version: str = "0.1.0"
    debug: bool = False

    # Server Settings
    host: str = "0.0.0.0"
    port: int = 8000

    # LLM Provider Settings
    llm_provider: Literal["openai", "claude"] = "openai"

    # OpenAI Settings
    openai_api_key: str = "your-openai-api-key"  # Default for testing
    openai_model: str = "gpt-4o-mini-2024-07-18"

    # Anthropic Claude Settings
    anthropic_api_key: str = "your-anthropic-api-key"  # Default for testing
    claude_model: str = "claude-3-5-sonnet-20241022"

    # Database Settings
    database_url: str = "postgresql://user:password@localhost:5432/llm_tournament"

    # CORS Settings
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]

    # Security Settings
    secret_key: str = "your-secret-key-here"

    # Evaluation Settings
    max_prompts_per_request: int = 10
    max_tokens_per_response: int = 500
    evaluation_timeout: int = 300  # seconds

    # Rate Limiting Settings
    input_tokens_per_minute: int = 20000
    output_tokens_per_minute: int = 8000
    max_retries: int = 2
    retry_delay_seconds: float = 5.0
    max_concurrent_requests: int = 10  # Conservative limit to avoid rate limits

    # Logging Settings
    log_level: str = "INFO"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


def get_settings() -> Settings:
    """Get application settings."""
    return Settings()


# Global settings instance
settings = get_settings()
