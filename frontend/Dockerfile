# ── CineMatch Backend — Production Dockerfile ──────────────────────────────
# Multi-stage build: keeps final image lean by separating build deps

FROM python:3.11-slim AS base

# System deps (for scikit-surprise C build)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ build-essential && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Dependency layer (cached unless requirements.txt changes) ───────────────
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ── App layer ───────────────────────────────────────────────────────────────
FROM deps AS runtime
COPY . .

# Download MovieLens 1M at build time so startup is fast
RUN python scripts/setup_data.py

# Non-root user for security
RUN useradd -m cinematch && chown -R cinematch /app
USER cinematch

EXPOSE 8000

# Gunicorn with uvicorn workers for production
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--timeout-keep-alive", "30"]
