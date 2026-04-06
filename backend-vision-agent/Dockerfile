FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

ENV PATH="/app/.venv/bin:${PATH}"
EXPOSE 8000

CMD ["uv", "run", "main.py", "serve", "--host", "0.0.0.0", "--port", "8000"]
