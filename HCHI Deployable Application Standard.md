# HCHI Deployable Application Standard

## Hybrid Cloud HomeLab Infrastructure (HCHI)

This document defines the required structure, deployment workflow, and CI/CD standards for applications deployed into the HCHI Platform Infrastructure.

The goal of this standard is to ensure:

* reusable deployments
* automated CI/CD
* intelligent routing
* Dockerized hosting
* centralized infrastructure management
* scalable multi-application hosting

---

# 1. Standard Application Structure

Every deployable application must follow this structure:

```text id="ukd83m"
app-name/
├── Dockerfile
├── deployment.json
├── .dockerignore
├── README.md
├── .github/
│   └── workflows/
│       └── deploy.yml
├── backend/
├── frontend/
└── application source code
```

---

# 2. Required Files

| File            | Required | Purpose                             |
| --------------- | -------- | ----------------------------------- |
| Dockerfile      | YES      | Container build instructions        |
| deployment.json | YES      | HCHI deployment metadata            |
| .dockerignore   | YES      | Optimized Docker builds             |
| deploy.yml      | YES      | Automated GitHub Actions deployment |
| README.md       | YES      | Project documentation               |

---

# 3. deployment.json Standard

This file is REQUIRED.

The HCHI deployment engine reads this configuration automatically.

## Example

```json id="sma28q"
{
  "app_name": "task-management-app",
  "container_name": "task-manager-app",
  "internal_domain": "task-manager.homelab",
  "container_port": 3031,
  "host_port": 3031,
  "health_endpoint": "/api/health",
  "restart_policy": "unless-stopped",
  "network": "homelab-network"
}
```

---

# 4. deployment.json Field Definitions

| Field           | Purpose                         |
| --------------- | ------------------------------- |
| app_name        | Docker image name               |
| container_name  | Docker container name           |
| internal_domain | Internal reverse proxy domain   |
| container_port  | Internal application port       |
| host_port       | Raspberry Pi exposed port       |
| health_endpoint | Health monitoring endpoint      |
| restart_policy  | Docker restart strategy         |
| network         | Docker network used for routing |

---

# 5. Dockerfile Standards

Applications MUST be Dockerized.

---

## Example — Static Frontend

```dockerfile id="as81qz"
FROM nginx:alpine

COPY . /usr/share/nginx/html

EXPOSE 80
```

---

## Example — Node.js Backend

```dockerfile id="vm27pl"
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3031

CMD ["npm", "start"]
```

---

# 6. Frontend Deployment Rules

For React/Vite applications:

## vite.config.js MUST include:

```js id="pw93rm"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './'
})
```

This ensures:

* reverse proxy compatibility
* proper asset loading
* Dockerized deployment support

---

# 7. Static Asset Rules

Applications MUST use:

* relative asset paths
* proxy-safe routing
* SPA-compatible configuration

Avoid hardcoded:

```text id="dq71xa"
/assets/...
```

Prefer:

```text id="bc62yw"
./assets/...
```

---

# 8. GitHub Actions Deployment Workflow

Every application must include:

```text id="lz51mn"
.github/workflows/deploy.yml
```

---

## Standard Workflow

```yaml id="ft20vk"
name: HCHI Automated Deployment

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: self-hosted

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Run HCHI Deployment Engine
        run: |
          /mnt/homelab-storage/platform/deploy-local-app.sh
```

---

# 9. HCHI Automated Deployment Flow

```text id="eg47qs"
Developer Laptop
        ↓
Git Push
        ↓
GitHub Repository
        ↓
GitHub Actions
        ↓
Self-Hosted Runner (Pi 5)
        ↓
HCHI Deployment Engine
        ↓
Docker Build & Deployment
        ↓
NGINX Proxy Manager Routing
        ↓
Application Live
```

---

# 10. Initial Deployment Process

When deploying a NEW application for the first time:

---

## Step 1 — Create GitHub Repository

Push application source code from laptop to GitHub.

---

## Step 2 — Ensure Required Files Exist

Required:

* Dockerfile
* deployment.json
* .github/workflows/deploy.yml

---

## Step 3 — Verify Self-Hosted Runner Online

On GitHub:

* Repository
* Settings
* Actions
* Runners

Ensure Raspberry Pi runner is:

```text id="op18zr"
Idle
```

---

## Step 4 — Push to Main Branch

```bash id="ce74yn"
git add .

git commit -m "Initial deployment"

git push
```

---

## Step 5 — GitHub Actions Automatically Deploys

The HCHI platform will automatically:

* build Docker image
* create container
* attach Docker network
* configure restart policy
* create NGINX route
* expose application

---

# 11. Accessing Applications

Applications can be accessed using:

## Direct Port Access

```text id="ik59tw"
http://192.168.1.10:3031
```

---

## Intelligent Internal Routing

```text id="hy42pb"
http://task-manager.homelab
```

---

# 12. Local DNS Setup (Laptop)

Add internal domains to:

```text id="ju84xn"
C:\Windows\System32\drivers\etc\hosts
```

Example:

```text id="gb30rm"
192.168.1.10 task-manager.homelab
```

---

# 13. HCHI Platform Features

Applications deployed into HCHI automatically support:

* Dockerized deployment
* Self-hosted CI/CD
* Reverse proxy routing
* Internal intelligent routing
* Multi-app hosting
* Automatic restart policies
* Centralized deployment engine
* Reusable infrastructure patterns

---

# 14. Future Platform Features

Planned upgrades include:

* automatic rollback system
* deployment dashboard
* internal DNS via Pi-hole
* monitoring & observability
* deployment logs visualization
* health monitoring
* automatic SSL
* deployment registry

---

# 15. HCHI Platform Philosophy

The HCHI platform is designed to simulate:

* enterprise DevOps workflows
* platform engineering concepts
* self-hosted cloud infrastructure
* intelligent routing systems
* automated CI/CD pipelines

The focus is:

* zero-cost infrastructure
* open-source tooling
* Raspberry Pi hosting
* AWS free-tier integration
* real-world infrastructure engineering experience
