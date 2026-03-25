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

import time
from config import Config
from openai import AsyncAzureOpenAI
import traceback
import asyncio

async def acquire_lock(lock_name: str, timeout_seconds: int = 3600) -> bool:
    """Distributed lock for clustered cron jobs."""
    try:
        import aiosqlite
        async with aiosqlite.connect(Config.DB_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS distributed_locks (
                    name TEXT PRIMARY KEY,
                    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP
                )
            """)
            cursor = await db.execute("""
                UPDATE distributed_locks 
                SET acquired_at = CURRENT_TIMESTAMP, expires_at = datetime('now', f'+{timeout_seconds} seconds')
                WHERE name = ? AND expires_at < CURRENT_TIMESTAMP
            """, (lock_name,))
            if cursor.rowcount > 0:
                await db.commit()
                return True
            try:
                await db.execute("""
                    INSERT INTO distributed_locks (name, expires_at) 
                    VALUES (?, datetime('now', f'+{timeout_seconds} seconds'))
                """, (lock_name,))
                await db.commit()
                return True
            except aiosqlite.IntegrityError:
                return False
        return False
    except Exception as e:
        logger.error(f"Lock error: {e}")
        return False

async def run_self_audit():
    """Continuously audit system entailment accuracy using the Ground Truth DB."""
    if not await acquire_lock("self_audit", 3500):
        logger.info("Self audit locked by another instance. Skipping.")
        return
        
    logger.info("Starting self-audit cycle...", extra={"custom_dimensions": {"job": "self_audit"}})
    try:
        from pipeline.verifier import verify_claim
        import database
        
        # Init OpenAI
        if not Config.has_azure_openai():
            logger.warning("Azure OpenAI disabled. Skipping self audit.")
            return
            
        openai_client = AsyncAzureOpenAI(
            azure_endpoint=Config.AZURE_OPENAI_ENDPOINT,
            api_key=Config.AZURE_OPENAI_API_KEY,
            api_version="2024-02-15-preview"
        )
        
        claims = await database.get_due_ground_truth_claims(limit=5)
        for c in claims:
            # Reconstruct the entailment using live API fetches
            results = await verify_claim(c['claim'], "factual", c['domain'], Config.AZURE_OPENAI_DEPLOYMENT_GPT4O_MINI, openai_client)
            
            # Simplified verdict aggregation
            supported = sum(1 for r in results if r['verdict'] == 'supported')
            refuted = sum(1 for r in results if r['verdict'] == 'refuted')
            
            if supported > refuted:
                final_verdict = 'supported'
            elif refuted > supported:
                final_verdict = 'refuted'
            else:
                final_verdict = 'inconclusive'
                
            correct = (final_verdict == c['expected_verdict'])
            
            audit_id = f"audit_{int(time.time()*1000)}"
            await database.log_self_audit(
                audit_id=audit_id,
                claim=c['claim'],
                expected=c['expected_verdict'],
                actual=final_verdict,
                correct=correct,
                domain=c['domain']
            )
            await database.update_ground_truth_validation(c['id'])
            
            # Wait to avoid rate limits
            await asyncio.sleep(2)
            
        logger.info(f"Self-audit cycle complete. Validated {len(claims)} claims.")
    except Exception as e:
        logger.error("Error during self audit", extra={"custom_dimensions": {"error": str(e), "trace": traceback.format_exc()}})

# Configure scheduler
scheduler = AsyncIOScheduler()
scheduler.add_job(purge_expired_data, 'cron', hour=2)  # Run at 2AM daily
scheduler.add_job(run_self_audit, 'interval', minutes=60) # Run self audit every hour
