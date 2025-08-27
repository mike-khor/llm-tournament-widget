import logging
from datetime import datetime
from typing import Optional

from app.core.config import settings
from sqlalchemy import JSON, Column, DateTime, Integer, String, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    pass


class EvaluationHistoryDB(Base):
    """SQLAlchemy model for evaluation history."""

    __tablename__ = "evaluation_history"

    id = Column(Integer, primary_key=True, index=True)
    evaluation_id = Column(String, unique=True, index=True, nullable=False)
    request_data = Column(JSON, nullable=False)
    response_data = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.now, onupdate=datetime.now, nullable=False
    )


class DatabaseManager:
    """Database manager for handling PostgreSQL operations."""

    def __init__(self, database_url: str):
        # Create async engine
        self.async_engine = create_async_engine(
            database_url.replace("postgresql://", "postgresql+asyncpg://"),
            echo=settings.debug,
            future=True,
        )

        # Create async session factory
        self.async_session = async_sessionmaker(
            bind=self.async_engine, class_=AsyncSession, expire_on_commit=False
        )

        # Create sync engine for migrations
        self.sync_engine = create_engine(database_url, echo=settings.debug)

    async def create_tables(self):
        """Create database tables."""
        try:
            async with self.async_engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            raise

    async def close(self):
        """Close database connections."""
        await self.async_engine.dispose()
        self.sync_engine.dispose()

    async def save_evaluation(
        self, evaluation_id: str, request_data: dict, response_data: dict
    ) -> Optional[EvaluationHistoryDB]:
        """Save evaluation to database."""
        try:
            async with self.async_session() as session:
                evaluation = EvaluationHistoryDB(
                    evaluation_id=evaluation_id,
                    request_data=request_data,
                    response_data=response_data,
                )
                session.add(evaluation)
                await session.commit()
                await session.refresh(evaluation)
                logger.info(f"Saved evaluation {evaluation_id} to database")
                return evaluation
        except Exception as e:
            logger.error(f"Failed to save evaluation {evaluation_id}: {e}")
            return None

    async def get_evaluation(self, evaluation_id: str) -> Optional[EvaluationHistoryDB]:
        """Get evaluation by ID."""
        try:
            async with self.async_session() as session:
                evaluation = await session.get(EvaluationHistoryDB, evaluation_id)
                return evaluation
        except Exception as e:
            logger.error(f"Failed to get evaluation {evaluation_id}: {e}")
            return None

    async def get_recent_evaluations(
        self, limit: int = 10
    ) -> list[EvaluationHistoryDB]:
        """Get recent evaluations."""
        try:
            async with self.async_session() as session:
                from sqlalchemy import desc, select

                stmt = (
                    select(EvaluationHistoryDB)
                    .order_by(desc(EvaluationHistoryDB.created_at))
                    .limit(limit)
                )
                result = await session.execute(stmt)
                evaluations = result.scalars().all()
                return list(evaluations)
        except Exception as e:
            logger.error(f"Failed to get recent evaluations: {e}")
            return []


# Global database manager instance
db_manager: Optional[DatabaseManager] = None


async def get_database() -> DatabaseManager:
    """Get database manager instance."""
    global db_manager
    if db_manager is None:
        db_manager = DatabaseManager(settings.database_url)
        await db_manager.create_tables()
    return db_manager


async def close_database():
    """Close database connection."""
    global db_manager
    if db_manager:
        await db_manager.close()
        db_manager = None
