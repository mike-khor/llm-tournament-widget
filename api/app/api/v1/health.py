import logging
from datetime import datetime

from app.core.config import settings
from app.db.database import DatabaseManager, get_database
from fastapi import APIRouter, Depends
from app.core.models import HealthResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check(db: DatabaseManager = Depends(get_database)):
    """Health check endpoint."""

    # Basic health check
    health_data = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": settings.version,
    }

    # Try to check database connection
    try:
        # Simple database check
        await db.get_recent_evaluations(limit=1)
        health_data["database"] = "connected"
    except Exception as e:
        logger.warning(f"Database health check failed: {e}")
        health_data["database"] = "disconnected"
        health_data["status"] = "degraded"

    return HealthResponse(**health_data)


@router.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "LLM Tournament API",
        "version": settings.version,
        "docs": "/docs",
    }
