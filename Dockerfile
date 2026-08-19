FROM node:22-alpine AS webbuild
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000
COPY shopping_cart_python/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
COPY shopping_cart_python ./shopping_cart_python
COPY --from=webbuild /app/assets ./assets
EXPOSE 8000
CMD ["sh", "-c", "python -m uvicorn shopping_cart_python.main:app --host 0.0.0.0 --port ${PORT}"]
