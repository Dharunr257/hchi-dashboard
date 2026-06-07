# Pi 5 Deployment Dashboard

A lightweight static web application served inside a Docker container on Raspberry Pi 5, triggered via GitHub Actions CI/CD.

---

## 📁 Project Structure

```
demo web application/
├── index.html              # Dashboard UI
├── style.css               # Dark-theme stylesheet
├── app.js                  # Vanilla JS — metrics, pipeline, logs
├── Dockerfile              # Multi-stage: Node build → Nginx serve
├── nginx.conf              # Nginx config with gzip + health endpoint
├── .dockerignore
└── .github/
    └── workflows/
        └── deploy.yml      # GitHub Actions CI/CD pipeline
```

---

## 🚀 Quick Start — Run Locally

```bash
# Build the image
docker build -t pi5-deploy-dashboard .

# Run it
docker run -d -p 8080:80 --name pi5-deploy-dashboard pi5-deploy-dashboard

# Open in browser
open http://localhost:8080
```

---

## 🍓 Deploy on Raspberry Pi 5

### 1. Add GitHub Secrets

| Secret | Value |
|---|---|
| `PI5_HOST` | Pi 5 IP address or hostname |
| `PI5_USER` | SSH username (e.g. `pi`) |
| `PI5_SSH_KEY` | Private SSH key (base64 or raw) |

### 2. Push to `main`

```bash
git add .
git commit -m "chore: initial deployment dashboard"
git push origin main
```

GitHub Actions will automatically:
1. Build the arm64 Docker image
2. Push it to GitHub Container Registry (`ghcr.io`)
3. SSH into your Pi 5 and run the container

### 3. Access the dashboard

```
http://<pi5-ip-address>
```

---

## 🏗️ Build for arm64 Locally (cross-compile)

```bash
docker buildx build \
  --platform linux/arm64 \
  -t pi5-deploy-dashboard:arm64 \
  --load .
```

---

## ⚙️ Environment / Secrets Reference

| Variable | Description |
|---|---|
| `PI5_HOST` | Raspberry Pi 5 IP or hostname |
| `PI5_USER` | SSH login username |
| `PI5_SSH_KEY` | SSH private key for passwordless login |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions for GHCR push |

---

## 🔧 Nginx Health Endpoint

The container exposes `GET /health → 200 OK`, used by Docker's `HEALTHCHECK` directive and the GitHub Actions deployment verification step.

---

## 📦 Image Details

| Property | Value |
|---|---|
| Base | `nginx:1.27-alpine` |
| Platform | `linux/arm64` |
| Exposed Port | `80` |
| Approx. Size | ~25 MB |
