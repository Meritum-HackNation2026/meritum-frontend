# syntax=docker/dockerfile:1
# 1. build: pnpm + Vite -> /app/dist
# 2. runtime: unprivileged nginx on :8080 serving dist, /api proxied to API_UPSTREAM
FROM node:26-slim AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install --global "$(node -p "require('./package.json').packageManager")" \
 && pnpm install --frozen-lockfile
COPY . ./
RUN pnpm build

FROM nginxinc/nginx-unprivileged:1.29-alpine
# Overridden by the deploy (meritum-api-<env>:8000); `api` fits a compose service.
ENV API_UPSTREAM=api:8000
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD ["wget", "-qO-", "http://127.0.0.1:8080/healthz"]
