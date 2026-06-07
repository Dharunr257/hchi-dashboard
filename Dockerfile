# ────────────────────────────────────────────────────────────
# Pi 5 Deployment Dashboard — Dockerfile
# Multi-stage build targeting linux/arm64 (Raspberry Pi 5)
# Served by Nginx Alpine for minimal image size
# ────────────────────────────────────────────────────────────

# Stage 1: Build (optional — kept for extensibility)
FROM node:20-alpine AS build
WORKDIR /app
# If you add a build step later (e.g. bundler), install deps here.
# For a pure static site this stage is a no-op copy.
COPY . .

# Stage 2: Serve with Nginx
FROM nginx:1.27-alpine AS final

# Remove default Nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy static assets from build stage
COPY --from=build /app/index.html  /usr/share/nginx/html/
COPY --from=build /app/style.css   /usr/share/nginx/html/
COPY --from=build /app/app.js      /usr/share/nginx/html/

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Healthcheck — used by Docker and Compose
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
