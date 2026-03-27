# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm install --no-audit --no-fund
RUN npm run build

# Runtime stage
FROM nginx:1.27-alpine
RUN apk add --no-cache gettext
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/entrypoint.sh /docker-entrypoint.d/99-nav-entrypoint.sh
RUN chmod +x /docker-entrypoint.d/99-nav-entrypoint.sh
