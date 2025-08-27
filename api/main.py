"""
FastAPI application entry point.
"""

from app.main import create_app
from app.core.config import settings

# Create FastAPI app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.log_level.lower(),
    )
