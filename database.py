"""Database layer for TruthMesh — SQLite with async access."""
import aiosqlite
import json
import logging
from typing import Optional
from cryptography.fernet import Fernet
from config import Config

DB_PATH = Config.DB_PATH

try:
    cipher_suite = Fernet(Config.FIELD_ENCRYPTION_KEY) if Config.FIELD_ENCRYPTION_KEY else None
    if not cipher_suite:
        logging.warning("FIELD_ENCRYPTION_KEY not set. Storing data in PLAINTEXT. Do not use in production.")
except Exception as e:
    logging.error(f"Failed to initialize encryption: {e}")
    cipher_suite = None

def encrypt_val(val: str) -> str:
    if not val or not cipher_suite:
        return val
    try:
        return cipher_suite.encrypt(val.encode('utf-8')).decode('utf-8')
    except Exception:
        return val

def decrypt_val(val: str) -> str:
    if not val or not cipher_suite:
        return val
    try:
        return cipher_suite.decrypt(val.encode('utf-8')).decode('utf-8')
    except Exception:
        return val


async def get_db():
    """Get async database connection."""
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    return db


async def init_db():
    """Initialize database schema with Production WAL mode."""
    async with aiosqlite.connect(DB_PATH) as db:
        # Enable Write-Ahead Logging for high-concurrency production safely
        await db.execute("PRAGMA journal_mode=WAL;")
        await db.execute("PRAGMA synchronous=NORMAL;")
        await db.execute("PRAGMA cache_size=-64000;") # 64MB cache
        
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

            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'Viewer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ground_truth_repository (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                claim TEXT UNIQUE NOT NULL,
                expected_verdict TEXT NOT NULL,
                domain TEXT NOT NULL,
                source_dataset TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_validated_at TIMESTAMP
            );
        """)
        
        # Ensure user_id column exists on query_log and verification_history for existing DBs
        try:
            await db.execute("ALTER TABLE query_log ADD COLUMN user_id INTEGER;")
        except Exception:
            pass  # Column already exists
            
        try:
            await db.execute("ALTER TABLE verification_history ADD COLUMN user_id INTEGER;")
        except Exception:
            pass
            
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
    encrypted_claim = encrypt_val(claim)
    encrypted_query_text = encrypt_val(query_text) if query_text else None
    
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO verification_history
               (query_id, query_text, claim, claim_type, source, source_detail,
                verdict, confidence, domain, model_used)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (query_id, encrypted_query_text, encrypted_claim, claim_type, source, source_detail,
             verdict, confidence, domain, model_used)
        )
        await db.commit()


async def log_query(query_id: str, query_text: str, domain_vector: dict,
                    routed_model: str, routing_reason: str, cached: bool = False,
                    user_id: Optional[int] = None):
    """Log a query."""
    encrypted_text = encrypt_val(query_text)
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO query_log
               (query_id, query_text, domain_vector, routed_model, routing_reason, cached, user_id)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (query_id, encrypted_text, json.dumps(domain_vector), routed_model,
             routing_reason, 1 if cached else 0, user_id)
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

async def ingest_ground_truth(claims: list) -> int:
    """Ingest a batch of ground truth claims."""
    inserted = 0
    async with aiosqlite.connect(DB_PATH) as db:
        for c in claims:
            try:
                await db.execute(
                    """INSERT INTO ground_truth_repository 
                       (claim, expected_verdict, domain, source_dataset)
                       VALUES (?, ?, ?, ?)""",
                    (c["claim"], c["expected_verdict"], c["domain"], c["source_dataset"])
                )
                inserted += 1
            except aiosqlite.IntegrityError:
                pass  # Skip duplicates
        await db.commit()
    return inserted

async def get_ground_truth_claim(claim: str) -> Optional[dict]:
    """Retrieve a single claim's exact match from the Ground Truth Repository."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM ground_truth_repository WHERE claim = ?",
            (claim,)
        )
        row = await cursor.fetchone()
        return dict(row) if row else None

async def get_due_ground_truth_claims(limit: int = 50) -> list:
    """Get claims that have never been validated or were validated > 7 days ago."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """SELECT * FROM ground_truth_repository 
               WHERE last_validated_at IS NULL 
                  OR last_validated_at <= datetime('now', '-7 days')
               ORDER BY RANDOM() LIMIT ?""",
            (limit,)
        )
        rows = await cursor.fetchall()
        return [dict(row) for row in rows]

async def update_ground_truth_validation(claim_id: int):
    """Mark a ground truth claim as validated."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE ground_truth_repository SET last_validated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (claim_id,)
        )
        await db.commit()


async def get_recent_queries(user_id: Optional[int] = None, limit: int = 10, is_admin: bool = False):
    """Get recent queries for the dashboard. If not admin, only get user's queries."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        
        query = """SELECT query_id, query_text, routed_model, overall_trust_score,
                          cached, created_at, domain_vector 
                   FROM query_log"""
        params = []
        
        if not is_admin and user_id is not None:
            query += " WHERE user_id = ?"
            params.append(user_id)
            
        query += " ORDER BY created_at DESC LIMIT ?"
        params.append(limit)
        
        cursor = await db.execute(query, tuple(params))
        rows = await cursor.fetchall()
        
        result = []
        for row in rows:
            row_dict = dict(row)
            row_dict["query_text"] = decrypt_val(row_dict["query_text"])
            result.append(row_dict)
        return result


# --- User Management ---

async def get_user_by_username(username: str):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = await cursor.fetchone()
        return dict(row) if row else None


async def create_user(username: str, hashed_password: str, role: str = "Viewer"):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO users (username, hashed_password, role) VALUES (?, ?, ?)",
            (username, hashed_password, role)
        )
        await db.commit()
        return cursor.lastrowid

