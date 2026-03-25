"""Helper script to apply distributed lock to the database."""
import asyncio
from database import get_db

async def apply_lock_schema():
    db = await get_db()
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS distributed_locks (
            name TEXT PRIMARY KEY,
            acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP
        );
    """)
    await db.commit()
    await db.close()

if __name__ == "__main__":
    asyncio.run(apply_lock_schema())
