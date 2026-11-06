FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app \
    HOME=/tmp \
    WEB_CONCURRENCY=1 \
    PORT=8080

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    addgroup --system finsignal && \
    adduser --system --ingroup finsignal --home /nonexistent --no-create-home finsignal

COPY --chown=finsignal:finsignal api ./api
COPY --chown=finsignal:finsignal src ./src
COPY --chown=finsignal:finsignal services ./services
COPY --chown=finsignal:finsignal config ./config
COPY --chown=finsignal:finsignal artifacts ./artifacts
COPY --chown=finsignal:finsignal experiments ./experiments

# The API is a read layer over committed research artifacts. Raw SEC archives,
# derived training panels, and Model Lab predictions belong to offline jobs and
# would add more than 5 GiB to every revision without serving a request.
COPY --chown=finsignal:finsignal data/manifests ./data/manifests
COPY --chown=finsignal:finsignal data/research/models ./data/research/models
COPY --chown=finsignal:finsignal data/research/reports ./data/research/reports
COPY --chown=finsignal:finsignal data/research/universe ./data/research/universe

# Compile the application's bytecode now, not on every cold start. The image
# sets PYTHONDONTWRITEBYTECODE, so nothing is ever compiled at runtime and each
# new instance would otherwise parse ~3 MB of Python source before it could
# answer. Measured on this tree: 0.68s -> 0.56s to import the app locally,
# which is a small share of a cold start dominated by image fetch and instance
# provisioning, but it costs nothing and cannot change behaviour. Done as root
# before the user switch; the files stay world-readable.
RUN python -m compileall -q api src services config

USER finsignal

CMD ["sh", "-c", "exec uvicorn api.index:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1 --proxy-headers --forwarded-allow-ips='*'"]
