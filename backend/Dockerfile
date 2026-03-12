FROM python:3.11-slim AS base

# System dependencies required for scikit-surprise compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    build-essential \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ── Dependency layer ─────────────────────────────
FROM base AS deps
COPY requirements.txt .

RUN pip install --upgrade pip setuptools wheel && \
    pip install "numpy<2.0" && \
    pip install --no-cache-dir --no-build-isolation -r requirements.txt

# ── Runtime layer ───────────────────────────────
FROM deps AS runtime
COPY . .

# Download dataset at build time
RUN python scripts/setup_data.py

# Non-root user
RUN useradd -m cinematch && chown -R cinematch /app
USER cinematch

EXPOSE 8000

CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"
