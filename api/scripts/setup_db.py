#!/usr/bin/env python3
"""
Database setup script for LLM Tournament API.

Creates all necessary database tables and runs initial setup.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the API directory to the Python path
api_dir = Path(__file__).parent.parent
sys.path.insert(0, str(api_dir))

from app.db.database import close_database, get_database

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def setup_database():
    """Set up the database tables."""
    try:
        logger.info("🔄 Connecting to database...")
        db = await get_database()
        logger.info("✅ Database connection established")

        logger.info("🔄 Creating database tables...")
        await db.create_tables()
        logger.info("✅ Database tables created successfully!")

        # Test database operations
        logger.info("🔄 Testing database operations...")
        recent_evaluations = await db.get_recent_evaluations(limit=1)
        logger.info(
            f"✅ Database test successful! Found {len(recent_evaluations)} existing evaluations"
        )

        logger.info("🔄 Closing database connection...")
        await close_database()
        logger.info("✅ Database setup completed successfully!")

    except Exception as e:
        logger.error(f"❌ Database setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("🚀 Setting up LLM Tournament database...")
    asyncio.run(setup_database())
    print("🎉 Database setup complete!")
