# Use official Python lightweight image
FROM python:3.12-slim as builder

# Set working directory
WORKDIR /app

# Install system dependencies required for building Python packages (like asyncpg, cryptography)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install dependencies into a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir azure-monitor-opentelemetry

# -------------------------
# Production Image
# -------------------------
FROM python:3.12-slim

# Create a non-root user for security
RUN groupadd -r truthmesh && useradd -r -g truthmesh truthmeshuser

WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the virtual environment from the builder
COPY --from=builder /opt/venv /opt/venv

# Ensure the virtualenv is in PATH
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Copy the application code
COPY . .

# Change ownership to the non-root user
RUN chown -R truthmeshuser:truthmesh /app

# Switch to the non-root user
USER truthmeshuser

# Expose the standard port
EXPOSE 8000

# Start Gunicorn with Uvicorn workers for production readiness
CMD ["gunicorn", "main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
