"""Database layer for TruthMesh — SQLite with async access."""
import aiosqlite
import json
from config import Config

DB_PATH = Config.DB_PATH


async def get_db():
    """Get async database connection."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """Initialize database schema."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.executescript("""
            CREATE TABLE IF NOT EXISTS topography_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model TEXT NOT NULL,
                domain TEXT NOT NULL,
                reliability_score REAL NOT NULL DEFAULT 0.5,
                confidence_lower REAL NOT NULL DEFAULT 0.3,
                confidence_upper REAL NOT NULL DEFAULT 0.7,
                sample_count INTEGER NOT NULL DEFAULT 0,
                source_label TEXT NOT NULL DEFAULT 'BASE',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(model, domain)
            );

            CREATE TABLE IF NOT EXISTS verification_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_id TEXT NOT NULL,
                query_text TEXT,
                claim TEXT NOT NULL,
                claim_type TEXT DEFAULT 'factual',
                source TEXT NOT NULL,
                source_detail TEXT,
                verdict TEXT NOT NULL,
                confidence REAL NOT NULL DEFAULT 0.5,
                domain TEXT,
                model_used TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS query_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query_id TEXT NOT NULL UNIQUE,
                query_text TEXT NOT NULL,
                domain_vector TEXT,
                routed_model TEXT,
                routing_reason TEXT,
                response_text TEXT,
                overall_trust_score REAL,
                verification_complete INTEGER DEFAULT 0,
                cached INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS self_audit_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                audit_id TEXT NOT NULL,
                injected_claim TEXT NOT NULL,
                expected_verdict TEXT NOT NULL,
                actual_verdict TEXT,
                correct INTEGER,
                domain TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        await db.commit()


async def get_topography_data():
    """Fetch all topography scores for the heatmap."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT model, domain, reliability_score, confidence_lower, "
            "confidence_upper, sample_count, source_label FROM topography_scores "
            "ORDER BY model, domain"
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]


async def get_topography_score(model: str, domain: str):
    """Get a single topography score."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM topography_scores WHERE model = ? AND domain = ?",
            (model, domain)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None


async def update_topography_score(model: str, domain: str, new_score: float,
                                   new_lower: float, new_upper: float,
                                   sample_count: int):
    """Update topography score after verification."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE topography_scores
               SET reliability_score = ?, confidence_lower = ?, confidence_upper = ?,
                   sample_count = ?, source_label = 'PRODUCTION', updated_at = CURRENT_TIMESTAMP
               WHERE model = ? AND domain = ?""",
            (new_score, new_lower, new_upper, sample_count, model, domain)
        )
        await db.commit()


async def log_verification(query_id: str, query_text: str, claim: str,
                           claim_type: str, source: str, source_detail: str,
                           verdict: str, confidence: float, domain: str,
                           model_used: str):
    """Log a verification result."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO verification_history
               (query_id, query_text, claim, claim_type, source, source_detail,
                verdict, confidence, domain, model_used)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (query_id, query_text, claim, claim_type, source, source_detail,
             verdict, confidence, domain, model_used)
        )
        await db.commit()


async def log_query(query_id: str, query_text: str, domain_vector: dict,
                    routed_model: str, routing_reason: str, cached: bool = False):
    """Log a query."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO query_log
               (query_id, query_text, domain_vector, routed_model, routing_reason, cached)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (query_id, query_text, json.dumps(domain_vector), routed_model,
             routing_reason, 1 if cached else 0)
        )
        await db.commit()


async def update_query_trust(query_id: str, trust_score: float, response_text: str):
    """Update query with final trust score."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE query_log
               SET overall_trust_score = ?, response_text = ?, verification_complete = 1
               WHERE query_id = ?""",
            (trust_score, response_text, query_id)
        )
        await db.commit()


async def log_self_audit(audit_id: str, claim: str, expected: str,
                         actual: str, correct: bool, domain: str):
    """Log a self-audit result."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO self_audit_results
               (audit_id, injected_claim, expected_verdict, actual_verdict, correct, domain)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (audit_id, claim, expected, actual, 1 if correct else 0, domain)
        )
        await db.commit()


async def get_self_audit_stats():
    """Get self-audit accuracy statistics."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT
                COUNT(*) as total,
                SUM(correct) as correct_count,
                CASE WHEN COUNT(*) > 0
                     THEN ROUND(CAST(SUM(correct) AS REAL) / COUNT(*) * 100, 1)
                     ELSE 0 END as accuracy
               FROM self_audit_results"""
        )
        row = await cursor.fetchone()
        return dict(row)


async def get_recent_queries(limit: int = 10):
    """Get recent queries for the dashboard."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT query_id, query_text, routed_model, overall_trust_score,
                      cached, created_at, domain_vector
               FROM query_log ORDER BY created_at DESC LIMIT ?""",
            (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]
