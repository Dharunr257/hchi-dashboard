# HCHI New Application Deployment Guide

## Hybrid Cloud HomeLab Infrastructure (HCHI)

This document defines the standard workflow for deploying NEW applications into the HCHI Platform Infrastructure using:

* Docker
* GitHub Actions
* Self-Hosted Runner
* HCHI Deployment Engine
* NGINX Proxy Manager

---

# 1. HCHI Infrastructure Paths

## Platform Root

```bash
/mnt/homelab-storage/platform
```

---

## Deployment Scripts

```bash
/mnt/homelab-storage/platform/scripts
```

---

## Applications Directory

```bash
/mnt/homelab-storage/platform/apps
```

---

## Deployments Metadata

```bash
/mnt/homelab-storage/platform/deployments
```

---

## Platform Logs

```bash
/mnt/homelab-storage/platform/logs
```

---

## GitHub Runner Path

```bash
/mnt/homelab-storage/docker/github-runner
```

---

# 2. Required Application Structure

Every application MUST contain:

```text
app-name/
├── Dockerfile
├── deployment.json
├── .dockerignore
├── README.md
├── .github/
│   └── workflows/
│       └── deploy.yml
```

---

# 3. Required deployment.json

Example:

```json
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

# 4. Required GitHub Actions Workflow

Path:

```text
.github/workflows/deploy.yml
```

Content:

```yaml
name: HCHI Automated Deployment

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: self-hosted

    steps:
      - name: Trigger HCHI Sync Engine
        run: |
          sync-app APP_FOLDER_NAME
```

IMPORTANT:

Replace:

```text
APP_FOLDER_NAME
```

with the actual folder name inside:

```bash
/mnt/homelab-storage/platform/apps
```

Example:

```yaml
sync-app Task-management-app
```

---

# 5. First-Time Application Deployment

## Step 1 — Push Code to GitHub

From laptop:

```bash
git add .

git commit -m "Initial deployment"

git push
```

---

# 6. Configure Shared HCHI Runner

Go to:

```text
GitHub Repository
→ Settings
→ Actions
→ Runners
→ New self-hosted runner
```

Choose:

* Linux
* ARM64

GitHub generates a command like:

```bash
./config.sh --url https://github.com/USERNAME/REPO --token XXXXX
```

COPY the command.

---

# 7. Configure Runner on Raspberry Pi

Go to:

```bash
cd /mnt/homelab-storage/docker/github-runner
```

Run the GitHub-generated command.

Example:

```bash
./config.sh --url https://github.com/Dharunr257/Task-management-app --token XXXXX
```

---

# 8. Install Runner as Persistent Service

Run:

```bash
sudo ./svc.sh install
```

Start service:

```bash
sudo ./svc.sh start
```

Verify:

```bash
sudo ./svc.sh status
```

Expected:

```text
active (running)
```

---

# 9. Deploy Application into HCHI

Run:

```bash
deploy-app GITHUB_REPO_URL
```

Example:

```bash
deploy-app https://github.com/Dharunr257/Task-management-app.git
```

The HCHI platform automatically:

* clones repository
* validates deployment.json
* builds Docker image
* creates container
* configures restart policy
* configures Docker networking
* configures NGINX proxy host
* saves deployment metadata
* enables CI/CD updates

---

# 10. Verify Deployment

Check running containers:

```bash
docker ps
```

---

Check proxy hosts:

```text
http://PI-IP:81
```

---

Check logs:

```bash
ls /mnt/homelab-storage/platform/logs
```

---

# 11. Verify CI/CD

Push update from laptop:

```bash
git add .

git commit -m "Update"

git push
```

GitHub Actions automatically:

* triggers runner
* executes sync-app
* rebuilds Docker image
* redeploys container

---

# 12. Useful Platform Commands

## Deploy New App

```bash
deploy-app <git-repo>
```

---

## Sync Existing App

```bash
sync-app <app-folder-name>
```

---

## Delete Application

```bash
delete-app <app-folder-name>
```

---

# 13. Useful Runner Commands

| Action          | Command                             |
| --------------- | ----------------------------------- |
| Register Runner | `./config.sh --url ... --token ...` |
| Install Service | `sudo ./svc.sh install`             |
| Start Service   | `sudo ./svc.sh start`               |
| Remove Runner   | `./config.sh remove --token ...`    |


## Runner Path

```bash
cd /mnt/homelab-storage/docker/github-runner
```

---

## Start Runner Service

```bash
sudo ./svc.sh start
```

---

## Stop Runner Service

```bash
sudo ./svc.sh stop
```

---

## Restart Runner Service

```bash
sudo ./svc.sh restart
```

---

## Runner Status

```bash
sudo ./svc.sh status
```

---

## Runner Logs

```bash
journalctl -u actions.runner.* -f
```

---

# 14. Important Platform Notes

## Docker Naming Rules

Docker image/container names MUST be lowercase.

The HCHI platform automatically converts names to lowercase internally.

---

## Container Persistence

All containers use:

```text
unless-stopped
```

restart policy.

Applications automatically restart after:

* reboot
* shutdown
* power loss

---

## NGINX Automation

The HCHI deployment engine automatically:

* creates proxy hosts
* configures routing
* enables internal domains

---

# 15. HCHI Platform Workflow

```text
Laptop Development
        ↓
Git Push
        ↓
GitHub Repository
        ↓
GitHub Actions
        ↓
HCHI Shared Runner
        ↓
sync-app.sh
        ↓
Docker Rebuild
        ↓
Container Redeploy
        ↓
Application Live
```

---

# 16. HCHI Platform Philosophy

The HCHI platform simulates:

* DevOps engineering
* CI/CD automation
* platform engineering
* self-hosted cloud infrastructure
* automated deployment systems
* centralized application orchestration

Built using:

* Raspberry Pi 5
* Docker
* GitHub Actions
* NGINX Proxy Manager
* Open-source infrastructure tooling
