# ShopFlow web: the shell + 3 micro frontends, built once and served as static
# files by nginx (non-root, port 8080). /v1 is NOT proxied here: on Stage 1,
# Caddy sends /v1 to the gateway and everything else to this container.
#   docker build -t shopflow-web .
#   docker run --rm -p 8080:8080 shopflow-web   → http://localhost:8080

# ---------- build ----------
FROM node:22-alpine AS build
WORKDIR /app
# Manifests first: `npm ci` is cached until a dependency changes.
COPY package.json package-lock.json ./
COPY apps/shell/package.json apps/shell/
COPY apps/catalog/package.json apps/catalog/
COPY apps/cart/package.json apps/cart/
COPY apps/checkout/package.json apps/checkout/
COPY packages/api/package.json packages/api/
COPY packages/ui/package.json packages/ui/
COPY packages/shared/package.json packages/shared/
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- run ----------
FROM nginxinc/nginx-unprivileged:1.28-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist-web /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
