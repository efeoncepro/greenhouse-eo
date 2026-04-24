# HubSpot Greenhouse Integration Service — Cloud Run (Python / Flask)
#
# Write bridge HubSpot ↔ Greenhouse: 23 HTTP routes + inbound webhook handler.
# Absorbed from cesargrowth11/hubspot-bigquery via TASK-574 (2026-04-24) with
# full git history preserved.
#
# Build:  docker build -t hubspot-greenhouse-integration \
#           -f services/hubspot_greenhouse_integration/Dockerfile .
# Run:    docker run -p 8080:8080 \
#           -e HUBSPOT_ACCESS_TOKEN=... \
#           -e GREENHOUSE_INTEGRATION_API_TOKEN=... \
#           -e HUBSPOT_APP_CLIENT_SECRET=... \
#           -e GREENHOUSE_BASE_URL=https://greenhouse.efeoncepro.com \
#           hubspot-greenhouse-integration
# Deploy: bash services/hubspot_greenhouse_integration/deploy.sh (requires ENV=staging|production)

FROM python:3.12-slim AS runner

# Pinned base + curl for in-container health checks + build tools for any
# compiled transitive deps. `--no-install-recommends` keeps the image lean.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Working directory matches the package layout. Gunicorn will resolve
# `app:app` from here. The `try/except` import block in app.py supports this
# standalone mode (see services/hubspot_greenhouse_integration/app.py:15-57).
WORKDIR /app

COPY services/hubspot_greenhouse_integration/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy runtime-only sources. Tests + __pycache__ + .pyc are excluded by
# .dockerignore so they never ship in the image.
COPY services/hubspot_greenhouse_integration/*.py ./
COPY services/hubspot_greenhouse_integration/Procfile ./Procfile

# Non-root user for defense-in-depth on Cloud Run.
RUN useradd --create-home --shell /usr/sbin/nologin --uid 10001 runtime \
    && chown -R runtime:runtime /app

USER runtime

ENV PORT=8080
EXPOSE 8080

# Gunicorn with 2 workers × 4 threads = 8 concurrent requests per instance.
# `--graceful-timeout` matches Cloud Run's 30s pre-termination window.
# `--timeout 60` matches HubSpot upstream timeouts observed in practice.
CMD exec gunicorn \
        --bind :${PORT:-8080} \
        --workers 2 \
        --threads 4 \
        --timeout 60 \
        --graceful-timeout 25 \
        --access-logfile - \
        --error-logfile - \
        app:app
