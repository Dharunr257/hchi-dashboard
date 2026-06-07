/* ======================================================
   app.js — Pi 5 Deployment Dashboard
   Pure vanilla JS, no dependencies
   ====================================================== */

'use strict';

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

  // Initial render
  renderPipeline(-1);
  refreshTables();
  updateStats(allDeployments);
  applyConfig();

  // Start live metrics loop
  updateMetrics(); // immediate
  setInterval(updateMetrics, 2000);

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

  /* ── Welcome toast ── */
  setTimeout(() => showToast('Pi 5 server online · arm64 ready', 'success'), 800);
});
