# Stage 1: Build React SPA
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
# Explicitly copy package configs first for layer caching
COPY frontend/package.json ./
COPY frontend/package-lock.json* ./
RUN npm ci || npm install
# Copy all frontend source files
COPY frontend/ ./
# Build the Vite/React application
RUN npm run build

# Stage 2: Python Backend (Production Image)
FROM python:3.12-slim as builder

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir azure-monitor-opentelemetry

# -------------------------
# Final Runtime Stage
# -------------------------
FROM python:3.12-slim

RUN groupadd -r truthmesh && useradd -r -g truthmesh truthmeshuser
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1

# Copy backend Python code
COPY . .

# Copy the compiled React SPA from Stage 1 into the Python backend where main.py expects it
COPY --from=frontend /app/frontend/dist ./frontend/dist

RUN chown -R truthmeshuser:truthmesh /app
USER truthmeshuser

EXPOSE 8000
CMD ["gunicorn", "main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
