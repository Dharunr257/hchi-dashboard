/* ======================================================
   app.js — Pi 5 Deployment Dashboard
   Pure vanilla JS, no dependencies
   ====================================================== */

'use strict';

/* ── Theme Persistence Setup ── */
const THEME_KEY = 'pi5deploy_theme';
function getSavedTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}
function applyTheme(theme) {
  if (theme === 'light') {
    document.documentElement.classList.add('light-theme');
  } else {
    document.documentElement.classList.remove('light-theme');
  }
}
applyTheme(getSavedTheme());

/* ── Seeded mock data ── */
const REPOS = ['my-app', 'api-service', 'frontend-ui', 'data-worker'];
const BRANCHES = ['main', 'develop', 'release/1.2', 'feature/auth'];
const PORTS = [3000, 3001, 8080, 8000];

const MOCK_DEPLOYMENTS = [
  { id: 'dep-009', repo: 'my-app', branch: 'main',           commit: 'a3f2c1d', status: 'success', duration: '1m 48s', ago: '3 min ago',  port: 3000 },
  { id: 'dep-008', repo: 'api-service', branch: 'develop',   commit: 'b9e12aa', status: 'success', duration: '2m 04s', ago: '22 min ago', port: 3001 },
  { id: 'dep-007', repo: 'frontend-ui', branch: 'main',      commit: 'c71f3ba', status: 'failed',  duration: '0m 52s', ago: '1 hr ago',   port: 8080 },
  { id: 'dep-006', repo: 'data-worker', branch: 'release/1.2', commit: 'd045ec2', status: 'success', duration: '3m 11s', ago: '3 hrs ago', port: 8000 },
  { id: 'dep-005', repo: 'my-app',     branch: 'feature/auth', commit: 'e8cdb91', status: 'success', duration: '1m 59s', ago: '6 hrs ago', port: 3000 },
  { id: 'dep-004', repo: 'api-service', branch: 'main',      commit: 'f12ae3d', status: 'failed',  duration: '1m 02s', ago: '1 day ago',  port: 3001 },
  { id: 'dep-003', repo: 'frontend-ui', branch: 'develop',   commit: '0b4c7f1', status: 'success', duration: '2m 33s', ago: '2 days ago', port: 8080 },
  { id: 'dep-002', repo: 'data-worker', branch: 'main',      commit: '1a2b3c4', status: 'success', duration: '1m 44s', ago: '3 days ago', port: 8000 },
];

/* ── Version 2 State & Metrics ── */
let activeContainers = [
  { name: 'hchi-dashboard', status: 'running', port: 3000, image: 'hchi-dashboard:v2.0-beta' },
  { name: 'pi-hole', status: 'running', port: 80, image: 'pihole/pihole:latest' },
  { name: 'home-assistant', status: 'running', port: 8123, image: 'homeassistant/home-assistant:stable' },
  { name: 'node-red', status: 'stopped', port: 1880, image: 'nodered/node-red:latest' }
];

let clusterNodes = [
  { name: 'pi5-master', role: 'Master / Docker Node', status: 'online', cpu: 28, mem: 52, temp: 48, disk: 42, uptime: '12d 4h' },
  { name: 'pi5-worker-01', role: 'Worker / Node-Red', status: 'online', cpu: 14, mem: 34, temp: 42, disk: 18, uptime: '8d 18h' },
  { name: 'proxmox-vm-01', role: 'HomeAssistant / DB', status: 'online', cpu: 19, mem: 62, temp: 38, disk: 55, uptime: '45d 1h' },
  { name: 'homelab-nas', role: 'Samba / Media Server', status: 'online', cpu: 8, mem: 24, temp: 35, disk: 78, uptime: '124d 9h' }
];

const chartHistory = {
  cpu: Array(30).fill(28),
  mem: Array(30).fill(52),
  maxSize: 30
};

const LOG_TEMPLATES = {
  success: (d) => `\x1b[step][GitHub Actions] Workflow triggered on push to ${d.branch}
[info] Runner: ubuntu-latest → dispatching to Pi 5 (192.168.1.100)
[info] Checking out ${d.repo}@${d.branch} (${d.commit})
[step]── Step 1/6: Clone Repository
[info] git clone https://github.com/owner/${d.repo}.git
[info] Cloned 342 objects, 47 MB
[step]── Step 2/6: Detect Runtime
[info] Found: Dockerfile (multi-stage, arm64 target)
[step]── Step 3/6: Build Docker Image
[info] docker buildx build --platform linux/arm64 -t ${d.repo}:${d.commit} .
[info] [1/4] FROM docker.io/library/node:20-alpine
[info] [2/4] COPY package*.json ./
[info] [3/4] RUN npm ci --production
[info] [4/4] COPY . .
[success] Image built successfully → ${d.repo}:${d.commit} (128 MB)
[step]── Step 4/6: Push to Registry
[info] docker push ghcr.io/owner/${d.repo}:${d.commit}
[success] Pushed to registry ✓
[step]── Step 5/6: Deploy on Pi 5
[info] SSH into raspberrypi5.local
[info] docker pull ghcr.io/owner/${d.repo}:${d.commit}
[info] Stopping old container ${d.repo}-prev…
[info] docker run -d -p ${d.port}:${d.port} --name ${d.repo} ${d.repo}:${d.commit}
[success] Container running → Container ID: 7f3a9c12e8b1
[step]── Step 6/6: Health Check
[info] GET http://localhost:${d.port}/health → 200 OK (45ms)
[success]✅ Deployment complete! URL: http://localhost:${d.port}
[info] Total time: ${d.duration}`,

  failed: (d) => `\x1b[step][GitHub Actions] Workflow triggered on push to ${d.branch}
[info] Runner: ubuntu-latest → dispatching to Pi 5 (192.168.1.100)
[info] Checking out ${d.repo}@${d.branch} (${d.commit})
[step]── Step 1/6: Clone Repository
[info] git clone https://github.com/owner/${d.repo}.git
[step]── Step 2/6: Detect Runtime
[info] Found: Dockerfile
[step]── Step 3/6: Build Docker Image
[info] docker buildx build --platform linux/arm64 -t ${d.repo}:${d.commit} .
[info] [1/3] FROM docker.io/library/node:20-alpine
[info] [2/3] COPY package*.json ./
[error]ERROR: failed to solve: failed to read dockerfile: no such file or directory
[error]Build failed after ${d.duration}
[error]❌ Deployment failed. Check Dockerfile path.`,
};

/* ── DOM refs ── */
const $ = (id) => document.getElementById(id);

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
function initTabs() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.nav-btn').forEach(b => { b.classList.remove('active'); b.removeAttribute('aria-current'); });
      document.querySelectorAll('.tab-panel').forEach(p => { p.classList.remove('active'); p.hidden = true; });
      btn.classList.add('active');
      btn.setAttribute('aria-current', 'page');
      const panel = $('tab-' + tab);
      panel.classList.add('active');
      panel.hidden = false;

      if (tab === 'dashboard') {
        initMetricsChart();
        drawMetricsChart();
      } else if (tab === 'cluster') {
        renderCluster();
      } else if (tab === 'terminal') {
        const termInput = $('terminal-input');
        if (termInput) setTimeout(() => termInput.focus(), 50);
      }
    });
  });
}

/* ============================================================
   BACKGROUND PARTICLE CANVAS
   ============================================================ */
function initCanvas() {
  const canvas = $('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.r  = Math.random() * 1.5 + 0.3;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.a  = Math.random() * 0.5 + 0.1;
    }
    update() {
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(124,58,237,${this.a})`;
      ctx.fill();
    }
  }

  resize();
  for (let i = 0; i < 80; i++) particles.push(new Particle());
  window.addEventListener('resize', resize);

  (function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  })();
}

/* ============================================================
   LIVE SERVER METRICS (simulated)
   ============================================================ */
let upSeconds = 0;
const INITIAL_CPU = 28, INITIAL_MEM = 52, INITIAL_DISK = 67, INITIAL_NET = 18;

function setBar(id, pct) {
  const el = $(id);
  if (el) el.style.width = Math.min(pct, 100) + '%';
}
function setVal(id, text) { const el = $(id); if (el) el.textContent = text; }

function fmtUptime(s) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600),
        m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m ${sec}s`;
  return `${m}m ${sec}s`;
}

function jitter(base, range) { return Math.max(1, Math.min(99, base + (Math.random() - 0.5) * range)); }

let cpu = INITIAL_CPU, mem = INITIAL_MEM, disk = INITIAL_DISK, net = INITIAL_NET;

function updateMetrics() {
  cpu  = jitter(cpu,  10);
  mem  = jitter(mem,  4);
  disk = jitter(disk, 2);
  net  = jitter(net,  15);
  upSeconds++;

  setBar('bar-cpu',  cpu);  setVal('val-cpu',  cpu.toFixed(1)  + '%');
  setBar('bar-mem',  mem);  setVal('val-mem',  mem.toFixed(1)  + '%');
  setBar('bar-disk', disk); setVal('val-disk', disk.toFixed(1) + '%');
  setBar('bar-net',  net);  setVal('val-net',  net.toFixed(1)  + ' MB/s');
  setVal('info-uptime', fmtUptime(upSeconds));

  // Version 2 Updates
  // 1. Scrolling canvas performance chart
  chartHistory.cpu.push(cpu);
  chartHistory.cpu.shift();
  chartHistory.mem.push(mem);
  chartHistory.mem.shift();
  drawMetricsChart();

  // 2. Homelab cluster node load updates
  updateClusterMetrics();
}

/* ============================================================
   REAL-TIME PERFORMANCE CHART (Canvas-based scrolling area)
   ============================================================ */
function initMetricsChart() {
  const canvas = $('metrics-chart');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
}

function drawMetricsChart() {
  const canvas = $('metrics-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.width / dpr;
  const height = canvas.height / dpr;

  ctx.clearRect(0, 0, width, height);

  // Helper to parse CSS variables
  function getRgbaFromVar(varName, alpha) {
    let color = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
    }
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  // Draw Grid Lines based on active theme border
  ctx.strokeStyle = getRgbaFromVar('--border', 0.5) || 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const lines = 4;
  for (let i = 1; i < lines; i++) {
    const y = (height / lines) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const pointsCount = chartHistory.cpu.length;
  const stepX = width / (pointsCount - 1);

  // Helper to draw filled lines
  function drawLine(history, strokeColor, fillColor) {
    ctx.beginPath();
    history.forEach((val, i) => {
      const x = i * stepX;
      const y = height - (val / 100) * (height - 30) - 15;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Fill Area
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  const cpuColor = getComputedStyle(document.documentElement).getPropertyValue('--purple-light').trim() || '#a78bfa';
  const memColor = getComputedStyle(document.documentElement).getPropertyValue('--cyan').trim() || '#06b6d4';

  // Draw Memory Area Chart
  drawLine(chartHistory.mem, memColor, getRgbaFromVar('--cyan', 0.06));

  // Draw CPU Area Chart
  drawLine(chartHistory.cpu, cpuColor, getRgbaFromVar('--purple-light', 0.09));
}

/* ============================================================
   ACTIVE CONTAINERS CONTROL PANEL
   ============================================================ */
function renderContainers() {
  const list = $('containers-list');
  if (!list) return;
  list.innerHTML = activeContainers.map(c => {
    let statusClass = 'status-pill--queued';
    let statusLabel = c.status;
    let actionsHtml = '';

    if (c.status === 'running') {
      statusClass = 'status-pill--success';
      statusLabel = 'running';
      actionsHtml = `
        <button class="c-btn c-btn--stop" data-name="${c.name}">Stop</button>
        <button class="c-btn c-btn--restart" data-name="${c.name}">Restart</button>
      `;
    } else if (c.status === 'stopped') {
      statusClass = 'status-pill--failed';
      statusLabel = 'stopped';
      actionsHtml = `
        <button class="c-btn" data-name="${c.name}">Start</button>
        <button class="c-btn c-btn--restart" data-name="${c.name}">Restart</button>
      `;
    } else {
      statusClass = 'status-pill--running';
      statusLabel = c.status;
      actionsHtml = `<span style="font-size:11px;color:var(--text-muted);padding:4px 8px;">Pending...</span>`;
    }

    return `
      <div class="container-item">
        <div class="container-info">
          <div class="container-name-row">
            <span class="container-name">${c.name}</span>
            <span class="status-pill ${statusClass}" style="padding: 1px 7px; font-size: 10px;">${statusLabel}</span>
          </div>
          <span class="container-status">${c.image} · port <span class="container-port">${c.port}</span></span>
        </div>
        <div class="container-actions">
          ${actionsHtml}
        </div>
      </div>
    `;
  }).join('');
  
  const activeCount = activeContainers.filter(c => c.status === 'running').length;
  $('containers-count').textContent = `${activeCount} active`;
}

window.stopContainer = (name) => {
  const c = activeContainers.find(x => x.name === name);
  if (!c) return;
  c.status = 'stopping';
  renderContainers();
  showToast(`Stopping container ${name}...`, 'info');
  setTimeout(() => {
    c.status = 'stopped';
    renderContainers();
    showToast(`Container ${name} stopped.`, 'error');
  }, 1200);
};

window.startContainer = (name) => {
  const c = activeContainers.find(x => x.name === name);
  if (!c) return;
  c.status = 'starting';
  renderContainers();
  showToast(`Starting container ${name}...`, 'info');
  setTimeout(() => {
    c.status = 'running';
    renderContainers();
    showToast(`Container ${name} is now online.`, 'success');
  }, 1200);
};

window.restartContainer = (name) => {
  const c = activeContainers.find(x => x.name === name);
  if (!c) return;
  c.status = 'restarting';
  renderContainers();
  showToast(`Restarting container ${name}...`, 'info');
  setTimeout(() => {
    c.status = 'running';
    renderContainers();
    showToast(`Container ${name} restarted successfully.`, 'success');
  }, 1500);
};

function initContainerActions() {
  const list = $('containers-list');
  if (!list) return;
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const name = btn.dataset.name;
    if (btn.classList.contains('c-btn--stop')) {
      window.stopContainer(name);
    } else if (btn.classList.contains('c-btn--restart')) {
      window.restartContainer(name);
    } else {
      window.startContainer(name);
    }
  });
}

/* ============================================================
   MULTI-NODE CLUSTER HEALTH MONITOR
   ============================================================ */
function renderCluster() {
  const grid = $('cluster-grid');
  if (!grid) return;
  grid.innerHTML = clusterNodes.map(node => {
    const tempClass = node.temp < 45 ? 'temp-status--cool' : node.temp < 60 ? 'temp-status--warm' : 'temp-status--hot';
    const statusClass = node.status === 'online' ? 'online' : 'offline';
    return `
      <div class="node-card ${statusClass}">
        <div class="node-card-header">
          <div class="node-identity">
            <span class="node-name">${node.name}</span>
            <span class="node-role">${node.role}</span>
          </div>
          <span class="node-status-badge ${statusClass}">${node.status}</span>
        </div>
        <div class="node-metrics-stack">
          <div class="node-metric-row">
            <span class="nm-label">CPU Load</span>
            <span class="nm-val">${node.cpu.toFixed(1)}%</span>
          </div>
          <div class="node-metric-row">
            <span class="nm-label">RAM Usage</span>
            <span class="nm-val">${node.mem.toFixed(1)}%</span>
          </div>
          <div class="node-metric-row">
            <span class="nm-label">Disk Space</span>
            <span class="nm-val">${node.disk.toFixed(0)}%</span>
          </div>
          <div class="node-metric-row">
            <span class="nm-label">Uptime</span>
            <span class="nm-val">${node.uptime}</span>
          </div>
        </div>
        <div class="node-temperature">
          <svg class="temp-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/></svg>
          <span>Temp: <strong class="temp-val ${tempClass}">${node.temp.toFixed(1)}°C</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

function updateClusterMetrics() {
  clusterNodes.forEach(node => {
    if (node.status === 'online') {
      node.cpu = jitter(node.cpu, 12);
      node.mem = jitter(node.mem, 4);
      node.temp = jitter(node.temp, 2.5);
      node.disk = jitter(node.disk, 0.1);
    }
  });
  renderCluster();
}

/* ============================================================
   INTERACTIVE SSH TERMINAL MOCKUP
   ============================================================ */
function initTerminal() {
  const form = $('terminal-form');
  const input = $('terminal-input');
  if (!form || !input) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const cmd = input.value.trim();
    input.value = '';
    if (!cmd) return;

    appendTerminalLine(`pi@pi5:~$ ${cmd}`, 'user-line');
    processTerminalCommand(cmd);
  });
}

function appendTerminalLine(text, className = '') {
  const output = $('terminal-output');
  if (!output) return;
  const line = document.createElement('div');
  line.className = `terminal-line ${className}`;
  line.innerHTML = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function processTerminalCommand(cmdText) {
  const args = cmdText.split(/\s+/);
  const cmd = args[0].toLowerCase();

  setTimeout(() => {
    switch (cmd) {
      case 'help':
        appendTerminalLine('Available custom HCHI commands:', 'output-info');
        appendTerminalLine('  help                           - Show this help manual');
        appendTerminalLine('  neofetch                       - Show system specs & ASCII branding');
        appendTerminalLine('  docker ps                      - Display active running containers');
        appendTerminalLine('  docker restart &lt;container&gt;    - Restart a designated container');
        appendTerminalLine('  top                            - Render active load & process stats');
        appendTerminalLine('  clear                          - Flush terminal output');
        break;
      case 'clear':
        const output = $('terminal-output');
        if (output) output.innerHTML = '';
        break;
      case 'neofetch':
        appendTerminalLine(`
<span style="color:#ef4444">   .---.  .---.</span>     <span style="color:#a78bfa">pi@raspberrypi5.local</span>
<span style="color:#ef4444">  /     \\/     \\</span>    ---------------------
<span style="color:#10b981">  \\\\  _  /  _  //</span>    OS: HCHI Linux (Ubuntu 24.04 ARM64)
<span style="color:#ef4444">   \\\\// \\\\// \\\\//</span>     Kernel: 6.8.0-1008-raspi
<span style="color:#ef4444">    /  \\  /  \\</span>      Uptime: ${fmtUptime(upSeconds)}
<span style="color:#ef4444">   |    ||    |</span>     Shell: bash 5.2.21
<span style="color:#ef4444">    \\  /  \\  /</span>      CPU: BCM2712 Cortex-A76 (4 Cores)
<span style="color:#ef4444">     \`---'---'</span>       Memory: ${Math.round((mem/100)*8192)}MB / 8192MB (8GB)
                     Board: Raspberry Pi 5 Model B Rev 1.0
        `, 'output-info');
        break;
      case 'docker':
        if (args[1] === 'ps') {
          appendTerminalLine('CONTAINER ID   IMAGE                                 STATUS          PORTS', 'output-info');
          activeContainers.forEach((c, idx) => {
            const id = 'bf9d81' + idx;
            const statusStr = c.status === 'running' ? 'Up 4 hours' : 'Exited (0) 10m ago';
            appendTerminalLine(`${id}       ${c.image.padEnd(36)}  ${statusStr.padEnd(14)}  0.0.0.0:${c.port}-&gt;${c.port}/tcp`);
          });
        } else if (args[1] === 'restart') {
          const target = args[2];
          if (!target) {
            appendTerminalLine('Error: docker restart needs a container name argument. Usage: docker restart [name]', 'output-error');
            break;
          }
          const c = activeContainers.find(x => x.name === target);
          if (!c) {
            appendTerminalLine(`Error: container "${target}" not found.`, 'output-error');
          } else {
            appendTerminalLine(`Triggered restart signal for container "${target}"...`, 'output-info');
            window.restartContainer(target);
            setTimeout(() => {
              appendTerminalLine(`Container "${target}" restart complete.`, 'output-success');
            }, 1500);
          }
        } else {
          appendTerminalLine('Docker usage: docker [ps | restart &lt;container_name&gt;]', 'output-warn');
        }
        break;
      case 'top':
        appendTerminalLine(`top - ${new Date().toLocaleTimeString()} up ${fmtUptime(upSeconds)}, 1 user, load average: 0.28, 0.15, 0.10`, 'output-info');
        appendTerminalLine(`Tasks: 82 total, 1 running, 81 sleeping`, 'output-info');
        appendTerminalLine(`%Cpu(s): ${cpu.toFixed(1)} us, 2.1 sy, 90.0 id`, 'output-info');
        appendTerminalLine(`MiB Mem: 8192.0 total, ${Math.round((mem/100)*8192)}.0 used, ${(8192 - Math.round((mem/100)*8192))}.0 free`, 'output-info');
        appendTerminalLine('', 'output-info');
        appendTerminalLine('  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND', 'output-info');
        appendTerminalLine(' 2132 pi        20   0  782104  82410  39120 S   5.8   1.0   0:18.42 dockerd', 'output-info');
        appendTerminalLine(' 3110 pi        20   0   48120  14120   8120 R   3.1   0.2   0:01.05 top', 'output-info');
        appendTerminalLine('  902 root      20   0       0      0      0 S   0.5   0.0   0:11.48 kworker/u:2', 'output-info');
        break;
      default:
        appendTerminalLine(`bash: ${cmd}: command not found. Type 'help' to review allowed actions.`, 'output-error');
    }
  }, 120);
}

/* ============================================================
   PIPELINE STEPS
   ============================================================ */
const PIPELINE_DEFS = [
  { name: 'Trigger from GitHub Actions', meta: 'push → main branch detected' },
  { name: 'Clone Repository',            meta: 'git clone via SSH deploy key' },
  { name: 'Build Docker Image',          meta: 'docker buildx --platform linux/arm64' },
  { name: 'Push to Registry',            meta: 'ghcr.io / docker hub' },
  { name: 'Deploy on Pi 5',             meta: 'docker pull & run on raspberrypi5.local' },
  { name: 'Health Check',               meta: 'GET /health → 200 OK' },
];

let pipelineState = 'done'; // 'done' | 'running' | 'idle'
let pipelineActive = -1;

function renderPipeline(activeStep) {
  const ol = $('pipeline-steps');
  ol.innerHTML = '';
  PIPELINE_DEFS.forEach((step, i) => {
    let cls, icon;
    if (activeStep < 0) { cls = 'step-dot--done'; icon = '✓'; }
    else if (i < activeStep)  { cls = 'step-dot--done';    icon = '✓'; }
    else if (i === activeStep){ cls = 'step-dot--active';  icon = '●'; }
    else                      { cls = 'step-dot--pending'; icon = String(i+1); }

    const li = document.createElement('li');
    li.className = 'pipeline-step';
    li.innerHTML = `
      <span class="step-dot ${cls}" aria-hidden="true">${icon}</span>
      <div class="step-body">
        <p class="step-name">${step.name}</p>
        <p class="step-meta">${step.meta}</p>
      </div>`;
    ol.appendChild(li);
  });
}

function runPipelineAnimation() {
  pipelineActive = 0;
  pipelineState = 'running';
  function tick() {
    renderPipeline(pipelineActive);
    if (pipelineActive < PIPELINE_DEFS.length) {
      pipelineActive++;
      setTimeout(tick, 900 + Math.random() * 400);
    } else {
      pipelineActive = -1;
      pipelineState = 'done';
      renderPipeline(-1);
    }
  }
  tick();
}

/* ============================================================
   STATS
   ============================================================ */
function updateStats(deployments) {
  const total   = deployments.length;
  const success = deployments.filter(d => d.status === 'success').length;
  const running = deployments.filter(d => d.status === 'running').length;
  const rate    = total ? Math.round((success / total) * 100) : 0;

  animateCount('stat-total',      total);
  animateCount('stat-containers', running || 3);
  setVal('stat-success', rate + '%');
  setVal('stat-time',    '1m 52s');
}

function animateCount(id, target) {
  const el = $(id);
  if (!el) return;
  let current = 0;
  const step  = Math.max(1, Math.ceil(target / 20));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 40);
}

/* ============================================================
   DEPLOYMENT TABLE
   ============================================================ */
function statusPill(status) {
  const map = { success: 'success', failed: 'failed', running: 'running', queued: 'queued' };
  const icon = { success: '✓', failed: '✗', running: '●', queued: '◌' };
  const s = map[status] || 'queued';
  return `<span class="status-pill status-pill--${s}">${icon[s]} ${s}</span>`;
}

function buildRow(d, idx) {
  const url = `http://localhost:${d.port}`;
  return `<tr>
    <td class="mono">#${String(idx + 1).padStart(3,'0')}</td>
    <td><strong>${d.repo}</strong></td>
    <td><span class="mono">${d.branch}</span></td>
    <td><span class="commit-hash">${d.commit}</span></td>
    <td>${statusPill(d.status)}</td>
    <td class="mono">${d.duration}</td>
    <td>${d.ago}</td>
    <td><a href="${url}" target="_blank" rel="noopener noreferrer" class="url-cell-link">${url}</a></td>
  </tr>`;
}

let allDeployments = [...MOCK_DEPLOYMENTS];

function renderTable(tbodyId, data) {
  const tbody = $(tbodyId);
  if (!tbody) return;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--text-muted)">No deployments found</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((d, i) => buildRow(d, i)).join('');
}

function refreshTables() {
  renderTable('deploy-tbody', allDeployments.slice(0, 5));
  renderTable('all-deploy-tbody', allDeployments);
  setVal('deploy-count', allDeployments.length + ' entries');
  populateLogSelect();
}

/* ============================================================
   LOG VIEWER
   ============================================================ */
function colorizeLog(raw) {
  return raw
    .replace(/\[step\]/g,    '<span class="log-line--step">')
    .replace(/\[info\]/g,    '<span class="log-line--info">')
    .replace(/\[success\]/g, '<span class="log-line--success">')
    .replace(/\[error\]/g,   '<span class="log-line--error">')
    .replace(/\[warn\]/g,    '<span class="log-line--warn">')
    .replace(/\n/g, '</span>\n') + '</span>';
}

function populateLogSelect() {
  const sel = $('log-deploy-select');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">Select deployment…</option>';
  allDeployments.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `#${d.id} — ${d.repo}@${d.commit} (${d.status})`;
    sel.appendChild(opt);
  });
  if (prev) sel.value = prev;
}

function showLog(depId) {
  const dep = allDeployments.find(d => d.id === depId);
  const out = $('log-output');
  if (!dep || !out) return;
  const tmpl = dep.status === 'failed' ? LOG_TEMPLATES.failed : LOG_TEMPLATES.success;
  out.innerHTML = colorizeLog(tmpl(dep));
  out.scrollTop = out.scrollHeight;
}

/* ============================================================
   DEPLOY MODAL
   ============================================================ */
function openModal() {
  $('modal-backdrop').classList.add('open');
  $('modal-backdrop').removeAttribute('aria-hidden');
  $('modal-repo').focus();
}
function closeModal() {
  $('modal-backdrop').classList.remove('open');
  $('modal-backdrop').setAttribute('aria-hidden', 'true');
}

function triggerDeployment(repo, branch, port) {
  const newDep = {
    id:       'dep-' + String(allDeployments.length + 1).padStart(3, '0'),
    repo, branch,
    commit:   Math.random().toString(16).slice(2, 9),
    status:   'running',
    duration: '—',
    ago:      'just now',
    port,
  };
  allDeployments.unshift(newDep);
  refreshTables();
  updateStats(allDeployments);
  runPipelineAnimation();
  showToast('🚀 Deployment triggered!', 'success');

  // Simulate completion after pipeline animation (~7s)
  setTimeout(() => {
    newDep.status   = Math.random() > 0.15 ? 'success' : 'failed';
    newDep.duration = `${Math.floor(Math.random() * 3) + 1}m ${Math.floor(Math.random() * 59)}s`;
    newDep.ago      = 'just now';
    refreshTables();
    updateStats(allDeployments);
    const msg = newDep.status === 'success'
      ? `✅ ${repo} deployed → http://localhost:${port}`
      : `❌ ${repo} deployment failed`;
    showToast(msg, newDep.status === 'success' ? 'success' : 'error');
    if (newDep.status === 'success') {
      const link = $('active-url');
      if (link) { link.href = `http://localhost:${port}`; link.textContent = `http://localhost:${port}`; }
    }
  }, 7500);
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = $('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icons[type] || 'ℹ️'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 350); }, 4000);
}

/* ============================================================
   SETTINGS PERSISTENCE (localStorage)
   ============================================================ */
const CFG_KEY = 'pi5deploy_config';
function loadConfig() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch { return {}; }
}
function saveConfig(patch) {
  const cfg = { ...loadConfig(), ...patch };
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}
function applyConfig() {
  const cfg = loadConfig();
  if (cfg.repo)     $('cfg-repo').value     = cfg.repo;
  if (cfg.branch)   $('cfg-branch').value   = cfg.branch;
  if (cfg.host)     $('cfg-host').value      = cfg.host;
  if (cfg.port)     $('cfg-port').value      = cfg.port;
  if (cfg.registry) $('cfg-registry').value  = cfg.registry;
  if (cfg.image)    $('cfg-image').value      = cfg.image;
  if (cfg.host)     $('info-ip').textContent  = cfg.host;
  if (cfg.repo)     $('modal-repo').value     = cfg.repo;
}

/* ============================================================
   FILTER / SEARCH
   ============================================================ */
function initFilters() {
  const statusSel  = $('filter-status');
  const searchInp  = $('filter-search');

  function applyFilters() {
    const status = statusSel.value;
    const query  = searchInp.value.toLowerCase();
    const filtered = allDeployments.filter(d => {
      const matchStatus = status === 'all' || d.status === status;
      const matchQuery  = !query || d.repo.includes(query) || d.commit.includes(query) || d.branch.includes(query);
      return matchStatus && matchQuery;
    });
    renderTable('all-deploy-tbody', filtered);
  }

  statusSel.addEventListener('change', applyFilters);
  searchInp.addEventListener('input',  applyFilters);
}

/* ============================================================
   COPY HELPERS
   ============================================================ */
function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!', 'info'));
}

/* ============================================================
   BOOT
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initCanvas();
  initTabs();

  // Version 2 initializations
  initMetricsChart();
  renderContainers();
  initContainerActions();
  renderCluster();
  initTerminal();

  // Initial render
  renderPipeline(-1);
  refreshTables();
  updateStats(allDeployments);
  applyConfig();

  // Start live metrics loop
  updateMetrics(); // immediate
  setInterval(updateMetrics, 2000);

  // Redraw chart on resize
  window.addEventListener('resize', () => {
    initMetricsChart();
    drawMetricsChart();
  });

  /* ── Modal ── */
  $('trigger-deploy-btn').addEventListener('click', openModal);
  $('modal-close').addEventListener('click', closeModal);
  $('modal-cancel').addEventListener('click', closeModal);
  $('modal-backdrop').addEventListener('click', (e) => { if (e.target === $('modal-backdrop')) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  $('modal-deploy-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const repo   = $('modal-repo').value.trim();
    const branch = $('modal-branch').value.trim() || 'main';
    const port   = parseInt($('modal-port').value) || 3000;
    if (!repo) { showToast('Please enter a repository name', 'error'); return; }
    closeModal();
    triggerDeployment(repo, branch, port);
  });

  /* ── Refresh pipeline ── */
  $('refresh-btn').addEventListener('click', () => {
    const btn = $('refresh-btn');
    btn.classList.add('spinning');
    setTimeout(() => { btn.classList.remove('spinning'); renderPipeline(-1); }, 800);
  });

  /* ── Copy URL ── */
  $('copy-url-btn').addEventListener('click', () => {
    const url = $('active-url').href;
    copyText(url);
  });

  /* ── Copy log ── */
  $('copy-log-btn').addEventListener('click', () => {
    copyText($('log-output').textContent);
  });

  /* ── Log select ── */
  $('log-deploy-select').addEventListener('change', (e) => {
    if (e.target.value) showLog(e.target.value);
    else $('log-output').textContent = 'Select a deployment above to view its logs…';
  });

  /* ── Settings forms ── */
  $('gh-settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveConfig({ repo: $('cfg-repo').value, branch: $('cfg-branch').value });
    showToast('GitHub config saved!', 'success');
  });
  $('server-settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveConfig({ host: $('cfg-host').value, port: $('cfg-port').value, registry: $('cfg-registry').value, image: $('cfg-image').value });
    if ($('cfg-host').value) $('info-ip').textContent = $('cfg-host').value;
    showToast('Server config saved!', 'success');
  });

  /* ── Theme Toggle Event ── */
  const themeToggle = $('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = getSavedTheme();
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, newTheme);
      applyTheme(newTheme);
      showToast(`Switched to ${newTheme} mode`, 'info');
      // Redraw charts since colors change
      initMetricsChart();
      drawMetricsChart();
    });
  }

  /* ── Welcome toast ── */
  setTimeout(() => showToast('Pi 5 server online · arm64 ready', 'success'), 800);
});
