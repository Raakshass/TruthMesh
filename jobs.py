"""Background jobs and data governance policies.

Implements automated data retention policies for PII/PHI compliance.
"""
import aiosqlite
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from config import Config
from monitoring import logger

DATA_RETENTION_POLICIES = {
    "Medical": {"query_retention_days": 90},       # HIPAA minimum
    "Legal": {"query_retention_days": 365},
    "Finance": {"query_retention_days": 365},      # SOX compliance
    "Science": {"query_retention_days": 730},
    "History": {"query_retention_days": 730},
}

async def purge_expired_data():
    """Delete queries past their retention period per domain to comply with GDPR/DPDP."""
    logger.info("Starting data retention purge job...", extra={"custom_dimensions": {"job": "data_purge"}})
    try:
        async with aiosqlite.connect(Config.DB_PATH) as db:
            for domain, policy in DATA_RETENTION_POLICIES.items():
                days = policy["query_retention_days"]
                
                # Delete old queries
                cursor = await db.execute(
                    "DELETE FROM query_log WHERE domain_vector LIKE ? AND created_at < datetime('now', ?)",
                    (f'%"{domain}"%', f'-{days} days')
                )
                await db.commit()
                if cursor.rowcount > 0:
                    logger.info(f"Purged {cursor.rowcount} expired {domain} queries.")
            
            # Catch-all
            cursor = await db.execute("DELETE FROM query_log WHERE created_at < datetime('now', '-730 days')")
            await db.commit()
            
            logger.info("Data retention purge complete.")
    except Exception as e:
        logger.error("Error during data purge", extra={"custom_dimensions": {"error": str(e)}})

# Configure scheduler
scheduler = AsyncIOScheduler()
scheduler.add_job(purge_expired_data, 'cron', hour=2)  # Run at 2AM daily
