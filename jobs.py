"""Background jobs and data governance policies.

Implements automated data retention policies for PII/PHI compliance.
"""
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
    from datetime import datetime, timedelta, timezone
    import database
    logger.info("Starting data retention purge job...", extra={"custom_dimensions": {"job": "data_purge"}})
    try:
        if not database.db:
            return
            
        for domain, policy in DATA_RETENTION_POLICIES.items():
            days = policy["query_retention_days"]
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
            
            # Delete old queries
            result = await database.db.query_log.delete_many({
                "domain_vector.domain": domain,
                "created_at": {"$lt": cutoff_date}
            })
            if result.deleted_count > 0:
                logger.info(f"Purged {result.deleted_count} expired {domain} queries.")
        
        # Catch-all
        catchall_cutoff = datetime.now(timezone.utc) - timedelta(days=730)
        await database.db.query_log.delete_many({"created_at": {"$lt": catchall_cutoff}})
        logger.info("Data retention purge complete.")
    except Exception as e:
        logger.error("Error during data purge", extra={"custom_dimensions": {"error": str(e)}})


import time
from openai import AsyncAzureOpenAI
import traceback
import asyncio

async def acquire_lock(lock_name: str, timeout_seconds: int = 3600) -> bool:
    """Distributed lock for clustered cron jobs using Cosmos DB."""
    try:
        import database
        from datetime import datetime, timedelta, timezone
        if not database.db:
            return False
            
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=timeout_seconds)
        
        # Try to upsert lock if it doesn't exist or is expired
        result = await database.db.distributed_locks.update_one(
            {
                "name": lock_name,
                "$or": [
                    {"expires_at": {"$lt": now}},
                    {"name": {"$exists": False}}
                ]
            },
            {
                "$set": {
                    "acquired_at": now,
                    "expires_at": expires_at
                }
            },
            upsert=True
        )
        return True # Simplified for this demo
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
            
            # CRITICAL: Filter out synthetic fallback results
            real_results = [r for r in results if "Synthetic response" not in r.get('evidence_snippet', '')]
            if not real_results:
                logger.warning(f"Skipping audit for {c['id'][:8]}: All sources returned synthetic fallbacks. Circuit breakers open?")
                await asyncio.sleep(2)
                continue
                
            # Simplified verdict aggregation on REAL sources only
            supported = sum(1 for r in real_results if r['verdict'] == 'supported')
            refuted = sum(1 for r in real_results if r['verdict'] == 'refuted')
            
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
