#!/bin/bash
set -e

echo "=== TruthMesh Startup Script ==="
echo "PORT: ${WEBSITES_PORT:-8000}"
echo "DB_PATH: ${DB_PATH:-truthmesh.db}"
echo "DEMO_MODE: ${DEMO_MODE:-true}"

# Ensure the data directory exists for SQLite persistent storage
DB_DIR=$(dirname "${DB_PATH:-truthmesh.db}")
if [ "$DB_DIR" != "." ]; then
    echo "Creating DB directory: $DB_DIR"
    mkdir -p "$DB_DIR"
fi

# Print Python version and verify critical imports
echo "Python: $(python --version 2>&1)"
python -c "
import sys
print(f'Python path: {sys.executable}')
try:
    import fastapi; print(f'fastapi {fastapi.__version__} OK')
    import uvicorn; print(f'uvicorn OK')
    import aiosqlite; print(f'aiosqlite OK')
    import sse_starlette; print(f'sse_starlette OK')
    import slowapi; print(f'slowapi OK')
    import cryptography; print(f'cryptography OK')
    import bcrypt; print(f'bcrypt OK')
    import jose; print(f'python-jose OK')
    import apscheduler; print(f'apscheduler OK')
    import httpx; print(f'httpx OK')
    import openai; print(f'openai OK')
    print('=== ALL IMPORTS OK ===')
except ImportError as e:
    print(f'FATAL IMPORT ERROR: {e}', file=sys.stderr)
    sys.exit(1)
"

echo "Starting gunicorn with 2 workers on port ${WEBSITES_PORT:-8000}..."
exec gunicorn \
    -k uvicorn.workers.UvicornWorker \
    --bind=0.0.0.0:${WEBSITES_PORT:-8000} \
    -w 2 \
    --timeout 120 \
    --graceful-timeout 30 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    main:app
