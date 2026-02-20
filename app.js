// ═══════════════════════════════════════════════════════════════
// SUB3 — Treadmill Workout Builder
// ═══════════════════════════════════════════════════════════════

// ── Config ────────────────────────────────────────────────────

const BLOCK_THEME = {
  warmup:   { fill: '#4b5563', glow: '#6b7280', gradient: ['#4b5563','#6b7280'], label: 'Warmup' },
  active:   { fill: '#2563eb', glow: '#3b82f6', gradient: ['#1d4ed8','#3b82f6'], label: 'Active' },
  recovery: { fill: '#16a34a', glow: '#22c55e', gradient: ['#15803d','#22c55e'], label: 'Recovery' },
  cooldown: { fill: '#d97706', glow: '#f59e0b', gradient: ['#b45309','#f59e0b'], label: 'Cooldown' },
};

const DEFAULTS = {
  warmup:   { duration: 300, startSpeed: 5,  endSpeed: 8,  startIncline: 0, endIncline: 1 },
  active:   { duration: 600, startSpeed: 10, endSpeed: 10, startIncline: 1, endIncline: 1 },
  recovery: { duration: 300, startSpeed: 6,  endSpeed: 6,  startIncline: 0, endIncline: 0 },
  cooldown: { duration: 300, startSpeed: 8,  endSpeed: 5,  startIncline: 1, endIncline: 0 },
};

const CANVAS_PAD = { top: 24, right: 16, bottom: 32, left: 52 };
const INCLINE_MAX_PX = 50;
const PUBLIC_REPO = 'ganeshapp/sub3';
const PUBLIC_PATH = 'workouts';

// ── State ─────────────────────────────────────────────────────

let intervals = [];
let selectedId = null;
let hoveredId = null;
let nextId = 1;
let blockRects = [];
let activeTab = 'design';

// ── DOM References ────────────────────────────────────────────

const $ = (s) => document.querySelector(s);
const canvas   = $('#workout-canvas');
const ctx      = canvas.getContext('2d');
const wrapper  = $('#canvas-wrapper');
const tooltip  = $('#canvas-tooltip');

const DOM = {
  statTime:      $('#stat-time'),
  statDistance:   $('#stat-distance'),
  statSpeed:     $('#stat-speed'),
  statPace:      $('#stat-pace'),
  statElevation: $('#stat-elevation'),
  statsBar:      $('#stats-bar'),
  emptyState:    $('#canvas-empty'),
  chipsContainer:$('#block-chips'),
  chipsPlaceholder: $('#chips-placeholder'),
  inspectorEmpty:   $('#inspector-empty'),
  inspectorContent: $('#inspector-content'),
  inspectorBadge:   $('#inspector-badge'),
  inspectorId:      $('#inspector-id'),
  inputName:     $('#input-name'),
  inputDesc:     $('#input-desc'),
  durMin:        $('#input-dur-min'),
  durSec:        $('#input-dur-sec'),
  startSpeed:    $('#slider-start-speed'),
  endSpeed:      $('#slider-end-speed'),
  startIncline:  $('#slider-start-incline'),
  endIncline:    $('#slider-end-incline'),
  valStartSpeed: $('#val-start-speed'),
  valEndSpeed:   $('#val-end-speed'),
  valStartIncline: $('#val-start-incline'),
  valEndIncline:   $('#val-end-incline'),
  settingsModal: $('#settings-modal'),
  settingPat:    $('#setting-pat'),
  settingRepo:   $('#setting-repo'),
  settingPath:   $('#setting-path'),
  tabMyCollection: $('#tab-my-collection'),
  fileInput:     $('#file-input'),
};

// ── Utility ───────────────────────────────────────────────────

function fmtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function fmtTimeShort(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return s > 0 ? `${m}m${String(s).padStart(2,'0')}s` : `${m}m`;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// ── Toast Notifications ───────────────────────────────────────

let toastTimer = null;

function showToast(msg, type = 'success') {
  const inner = $('#toast-inner');
  const icon  = $('#toast-icon');
  const text  = $('#toast-msg');

  text.textContent = msg;

  const icons = {
    success: 'ph-check-circle',
    error:   'ph-warning-circle',
    info:    'ph-info',
    loading: 'ph-spinner-gap',
  };
  const colors = {
    success: 'text-emerald-400',
    error:   'text-red-400',
    info:    'text-cyan-400',
    loading: 'text-slate-400',
  };

  icon.className = `ph ${icons[type] || icons.info} text-lg ${colors[type] || colors.info}`;
  if (type === 'loading') icon.classList.add('animate-spin');

  inner.classList.remove('toast-hidden');
  inner.classList.add('toast-visible');

  clearTimeout(toastTimer);
  if (type !== 'loading') {
    toastTimer = setTimeout(() => {
      inner.classList.remove('toast-visible');
      inner.classList.add('toast-hidden');
    }, 3000);
  }
}

function hideToast() {
  const inner = $('#toast-inner');
  inner.classList.remove('toast-visible');
  inner.classList.add('toast-hidden');
  clearTimeout(toastTimer);
}

// ── Settings (localStorage) ──────────────────────────────────

function getSettings() {
  return {
    pat:  localStorage.getItem('sub3_pat') || '',
    repo: localStorage.getItem('sub3_repo') || '',
    path: localStorage.getItem('sub3_path') || '/',
  };
}

function openSettings() {
  const s = getSettings();
  DOM.settingPat.value  = s.pat;
  DOM.settingRepo.value = s.repo;
  DOM.settingPath.value = s.path;
  DOM.settingsModal.classList.remove('hidden');
}

function closeSettings() {
  DOM.settingsModal.classList.add('hidden');
}

function saveSettings() {
  const pat  = DOM.settingPat.value.trim();
  const repo = DOM.settingRepo.value.trim();
  const path = DOM.settingPath.value.trim() || '/';

  localStorage.setItem('sub3_pat', pat);
  localStorage.setItem('sub3_repo', repo);
  localStorage.setItem('sub3_path', path);

  closeSettings();
  refreshMyCollectionTab();
  showToast('Settings saved', 'success');
}

function refreshMyCollectionTab() {
  const { pat } = getSettings();
  DOM.tabMyCollection.classList.toggle('hidden', !pat);
}

// ── Tab Navigation ────────────────────────────────────────────

function switchTab(tab) {
  activeTab = tab;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  const viewId = `view-${tab}`;
  const view = document.getElementById(viewId);
  if (view) {
    view.classList.remove('hidden');
  }

  DOM.statsBar.classList.toggle('hidden', tab !== 'design');

  if (tab === 'design') {
    setTimeout(() => renderCanvas(), 50);
  } else if (tab === 'collection') {
    fetchCollection();
  } else if (tab === 'my-collection') {
    fetchMyCollection();
  }
}

// ── Stats Calculation (per spec formulas) ─────────────────────

function calcStats() {
  if (intervals.length === 0) {
    return { totalTime: 0, totalDist: 0, avgSpeed: 0, avgPace: null, elevation: 0 };
  }

  let totalTime = 0;
  let totalDist = 0;
  let elevation = 0;

  for (const b of intervals) {
    totalTime += b.duration_seconds;
    const avgSpeed = (b.start_speed_kmh + b.end_speed_kmh) / 2;
    const blockDist = avgSpeed * (b.duration_seconds / 3600);
    totalDist += blockDist;

    const avgIncline = (b.start_incline_pct + b.end_incline_pct) / 2;
    const distMeters = blockDist * 1000;
    elevation += distMeters * Math.sin(Math.atan(avgIncline / 100));
  }

  const avgSpeed = totalTime > 0 ? totalDist / (totalTime / 3600) : 0;
  let avgPace = null;
  if (avgSpeed > 0) {
    const decimalMin = 60 / avgSpeed;
    let paceMin = Math.floor(decimalMin);
    let paceSec = Math.round((decimalMin - paceMin) * 60);
    if (paceSec === 60) { paceMin++; paceSec = 0; }
    avgPace = `${paceMin}:${String(paceSec).padStart(2,'0')}`;
  }

  return { totalTime, totalDist, avgSpeed, avgPace, elevation };
}

// ── State Mutations ───────────────────────────────────────────

function addInterval(type) {
  const d = DEFAULTS[type];
  intervals.push({
    id: nextId++,
    type,
    duration_seconds: d.duration,
    start_speed_kmh: d.startSpeed,
    end_speed_kmh: d.endSpeed,
    start_incline_pct: d.startIncline,
    end_incline_pct: d.endIncline,
  });
  selectedId = intervals[intervals.length - 1].id;
  render();
}

function deleteSelected() {
  if (selectedId == null) return;
  intervals = intervals.filter(b => b.id !== selectedId);
  selectedId = null;
  render();
}

function duplicateSelected() {
  if (selectedId == null) return;
  const src = intervals.find(b => b.id === selectedId);
  if (!src) return;
  const idx = intervals.findIndex(b => b.id === selectedId);
  const dup = { ...src, id: nextId++ };
  intervals.splice(idx + 1, 0, dup);
  selectedId = dup.id;
  render();
}

function selectBlock(id) {
  selectedId = id;
  render();
}

function deselectBlock() {
  selectedId = null;
  render();
}

// ── Slider / Input Handlers ───────────────────────────────────

function onSliderChange() {
  const block = intervals.find(b => b.id === selectedId);
  if (!block) return;
  block.start_speed_kmh   = parseFloat(DOM.startSpeed.value);
  block.end_speed_kmh     = parseFloat(DOM.endSpeed.value);
  block.start_incline_pct = parseFloat(DOM.startIncline.value);
  block.end_incline_pct   = parseFloat(DOM.endIncline.value);

  DOM.valStartSpeed.textContent   = block.start_speed_kmh.toFixed(1);
  DOM.valEndSpeed.textContent     = block.end_speed_kmh.toFixed(1);
  DOM.valStartIncline.textContent = `${block.start_incline_pct.toFixed(1)}%`;
  DOM.valEndIncline.textContent   = `${block.end_incline_pct.toFixed(1)}%`;

  renderStats();
  renderCanvas();
  renderChips();
}

function onDurationChange() {
  const block = intervals.find(b => b.id === selectedId);
  if (!block) return;
  const m = clamp(parseInt(DOM.durMin.value) || 0, 0, 120);
  const s = clamp(parseInt(DOM.durSec.value) || 0, 0, 59);
  block.duration_seconds = m * 60 + s;
  if (block.duration_seconds < 5) block.duration_seconds = 5;
  DOM.durMin.value = Math.floor(block.duration_seconds / 60);
  DOM.durSec.value = block.duration_seconds % 60;
  renderStats();
  renderCanvas();
  renderChips();
}

// ── Render Orchestrator ───────────────────────────────────────

function render() {
  renderStats();
  renderCanvas();
  renderChips();
  renderInspector();
}

// ── Stats Bar Rendering ───────────────────────────────────────

function renderStats() {
  const s = calcStats();
  DOM.statTime.textContent      = fmtTime(s.totalTime);
  DOM.statDistance.textContent   = `${s.totalDist.toFixed(2)} km`;
  DOM.statSpeed.textContent     = `${s.avgSpeed.toFixed(1)} km/h`;
  DOM.statPace.textContent      = s.avgPace ? `${s.avgPace} /km` : '--:-- /km';
  DOM.statElevation.textContent = `${Math.round(s.elevation)} m`;
}

// ── Canvas Rendering ──────────────────────────────────────────

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = wrapper.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w: rect.width, h: rect.height };
}

function renderCanvas() {
  const { w, h } = resizeCanvas();
  ctx.clearRect(0, 0, w, h);

  DOM.emptyState.classList.toggle('hidden', intervals.length > 0);
  if (intervals.length === 0) { blockRects = []; return; }

  const pad = CANVAS_PAD;
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const totalTime = intervals.reduce((s, b) => s + b.duration_seconds, 0);
  const allSpeeds = intervals.flatMap(b => [b.start_speed_kmh, b.end_speed_kmh]);
  const maxSpeed = Math.max(15, ...allSpeeds) * 1.15;
  const maxIncline = Math.max(5, ...intervals.flatMap(b => [b.start_incline_pct, b.end_incline_pct])) * 1.2;

  drawGrid(w, h, pad, plotW, plotH, maxSpeed);
  drawBlocks(pad, plotW, plotH, totalTime, maxSpeed);
  drawInclineOverlay(pad, plotW, plotH, totalTime, maxIncline);
  drawTimeAxis(pad, plotW, plotH, totalTime);
}

function drawGrid(w, h, pad, plotW, plotH, maxSpeed) {
  ctx.save();
  const step = maxSpeed <= 16 ? 2 : maxSpeed <= 25 ? 5 : 10;
  for (let v = step; v < maxSpeed; v += step) {
    const y = pad.top + plotH - (v / maxSpeed) * plotH;
    ctx.strokeStyle = 'rgba(51,65,85,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.fillStyle = '#475569';
    ctx.font = '600 10px Inter, system-ui';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${v}`, pad.left - 8, y);
  }

  ctx.fillStyle = '#334155';
  ctx.font = '600 9px Inter, system-ui';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.save();
  ctx.translate(12, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('km/h', 0, 0);
  ctx.restore();
  ctx.restore();
}

function drawBlocks(pad, plotW, plotH, totalTime, maxSpeed) {
  blockRects = [];
  let x = pad.left;
  const bottom = pad.top + plotH;

  for (const block of intervals) {
    const bw = (block.duration_seconds / totalTime) * plotW;
    const startH = (block.start_speed_kmh / maxSpeed) * plotH;
    const endH   = (block.end_speed_kmh / maxSpeed) * plotH;
    const theme  = BLOCK_THEME[block.type];
    const isSelected = block.id === selectedId;
    const isHovered  = block.id === hoveredId;

    blockRects.push({ id: block.id, x, w: bw });

    ctx.save();

    const grad = ctx.createLinearGradient(x, bottom - Math.max(startH, endH), x, bottom);
    grad.addColorStop(0, theme.gradient[1] + (isSelected ? 'dd' : isHovered ? 'bb' : '99'));
    grad.addColorStop(1, theme.gradient[0] + (isSelected ? 'cc' : isHovered ? 'aa' : '55'));

    ctx.beginPath();
    ctx.moveTo(x, bottom);
    ctx.lineTo(x, bottom - startH);
    ctx.lineTo(x + bw, bottom - endH);
    ctx.lineTo(x + bw, bottom);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    if (isSelected) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowColor = theme.glow;
      ctx.shadowBlur = 12;
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      ctx.strokeStyle = theme.glow + '44';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (bw > 48) {
      ctx.fillStyle = isSelected ? '#fff' : '#e2e8f0cc';
      ctx.font = `600 ${bw > 80 ? 11 : 9}px Inter, system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const labelY = bottom - Math.max(startH, endH) - 6;
      ctx.fillText(theme.label, x + bw / 2, labelY);

      if (bw > 70) {
        ctx.font = '500 9px Inter, system-ui';
        ctx.fillStyle = isSelected ? '#ffffffaa' : '#94a3b8aa';
        const speedTxt = block.start_speed_kmh === block.end_speed_kmh
          ? `${block.start_speed_kmh} km/h`
          : `${block.start_speed_kmh}→${block.end_speed_kmh}`;
        ctx.fillText(speedTxt, x + bw / 2, labelY + 13);
      }
    }

    ctx.restore();
    x += bw;
  }
}

function drawInclineOverlay(pad, plotW, plotH, totalTime, maxIncline) {
  if (maxIncline <= 0) return;

  const bottom = pad.top + plotH;
  const inclineH = INCLINE_MAX_PX;
  let x = pad.left;

  ctx.save();
  ctx.globalAlpha = 0.3;

  ctx.beginPath();
  ctx.moveTo(pad.left, bottom);

  for (const block of intervals) {
    const bw = (block.duration_seconds / totalTime) * plotW;
    const startH = (block.start_incline_pct / maxIncline) * inclineH;
    const endH   = (block.end_incline_pct / maxIncline) * inclineH;
    ctx.lineTo(x, bottom - startH);
    ctx.lineTo(x + bw, bottom - endH);
    x += bw;
  }

  ctx.lineTo(x, bottom);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, bottom - inclineH, 0, bottom);
  grad.addColorStop(0, '#f97316');
  grad.addColorStop(1, '#f9731600');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.globalAlpha = 0.6;
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  x = pad.left;
  ctx.beginPath();
  for (let i = 0; i < intervals.length; i++) {
    const block = intervals[i];
    const bw = (block.duration_seconds / totalTime) * plotW;
    const startH = (block.start_incline_pct / maxIncline) * inclineH;
    const endH   = (block.end_incline_pct / maxIncline) * inclineH;
    if (i === 0) ctx.moveTo(x, bottom - startH);
    else ctx.lineTo(x, bottom - startH);
    ctx.lineTo(x + bw, bottom - endH);
    x += bw;
  }
  ctx.stroke();
  ctx.restore();
}

function drawTimeAxis(pad, plotW, plotH, totalTime) {
  const bottom = pad.top + plotH;
  let accumulated = 0;
  let x = pad.left;

  ctx.save();
  ctx.fillStyle = '#475569';
  ctx.font = '500 9px Inter, system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  ctx.fillText(fmtTime(0), pad.left, bottom + 6);

  for (const block of intervals) {
    const bw = (block.duration_seconds / totalTime) * plotW;
    accumulated += block.duration_seconds;
    x += bw;

    ctx.strokeStyle = 'rgba(51,65,85,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, bottom + 3);
    ctx.stroke();

    ctx.fillText(fmtTime(accumulated), x, bottom + 6);
  }
  ctx.restore();
}

// ── Chips Rendering ───────────────────────────────────────────

function renderChips() {
  const container = DOM.chipsContainer;
  container.innerHTML = '';

  if (intervals.length === 0) {
    const span = document.createElement('span');
    span.className = 'text-xs text-slate-600 select-none';
    span.id = 'chips-placeholder';
    span.textContent = 'Your interval blocks will appear here';
    container.appendChild(span);
    return;
  }

  intervals.forEach(block => {
    const chip = document.createElement('button');
    chip.className = `block-chip block-chip-${block.type} fade-in${block.id === selectedId ? ' selected' : ''}`;
    chip.textContent = `${BLOCK_THEME[block.type].label} · ${fmtTimeShort(block.duration_seconds)}`;
    chip.onclick = () => selectBlock(block.id);
    container.appendChild(chip);
  });
}

// ── Inspector Rendering ───────────────────────────────────────

function renderInspector() {
  const block = intervals.find(b => b.id === selectedId);
  const hasBlock = !!block;

  DOM.inspectorEmpty.classList.toggle('hidden', hasBlock);
  DOM.inspectorContent.classList.toggle('hidden', !hasBlock);

  if (!block) return;

  const theme = BLOCK_THEME[block.type];
  DOM.inspectorBadge.className = `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide badge-${block.type}`;
  DOM.inspectorBadge.textContent = theme.label;
  DOM.inspectorId.textContent = `#${block.id}`;

  DOM.durMin.value = Math.floor(block.duration_seconds / 60);
  DOM.durSec.value = block.duration_seconds % 60;

  DOM.startSpeed.value   = block.start_speed_kmh;
  DOM.endSpeed.value     = block.end_speed_kmh;
  DOM.startIncline.value = block.start_incline_pct;
  DOM.endIncline.value   = block.end_incline_pct;

  DOM.valStartSpeed.textContent   = block.start_speed_kmh.toFixed(1);
  DOM.valEndSpeed.textContent     = block.end_speed_kmh.toFixed(1);
  DOM.valStartIncline.textContent = `${block.start_incline_pct.toFixed(1)}%`;
  DOM.valEndIncline.textContent   = `${block.end_incline_pct.toFixed(1)}%`;
}

// ── Canvas Interaction ────────────────────────────────────────

function getBlockAtX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  for (const br of blockRects) {
    if (mx >= br.x && mx < br.x + br.w) return br.id;
  }
  return null;
}

canvas.addEventListener('click', (e) => {
  const id = getBlockAtX(e.clientX);
  if (id != null) {
    selectBlock(id);
  } else {
    deselectBlock();
  }
});

canvas.addEventListener('mousemove', (e) => {
  const id = getBlockAtX(e.clientX);
  canvas.style.cursor = id ? 'pointer' : 'default';

  if (id !== hoveredId) {
    hoveredId = id;
    renderCanvas();
  }

  if (id) {
    const block = intervals.find(b => b.id === id);
    if (block) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      tooltip.classList.remove('hidden');
      tooltip.innerHTML = `<strong>${BLOCK_THEME[block.type].label}</strong> · ${fmtTimeShort(block.duration_seconds)}<br>`
        + `Speed: ${block.start_speed_kmh}–${block.end_speed_kmh} km/h · Incline: ${block.start_incline_pct}–${block.end_incline_pct}%`;
      tooltip.style.left = clamp(x + 12, 0, rect.width - 200) + 'px';
      tooltip.style.top  = clamp(y - 50, 4, rect.height - 60) + 'px';
    }
  } else {
    tooltip.classList.add('hidden');
  }
});

canvas.addEventListener('mouseleave', () => {
  hoveredId = null;
  tooltip.classList.add('hidden');
  renderCanvas();
});

// ── Import JSON ───────────────────────────────────────────────

function importJSON() {
  DOM.fileInput.click();
}

DOM.fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);

      if (!data.intervals || !Array.isArray(data.intervals)) {
        showToast('Invalid workout file: missing intervals array', 'error');
        return;
      }

      intervals = data.intervals.map((b, i) => ({
        id: nextId++,
        type: b.type || 'active',
        duration_seconds: b.duration_seconds || 300,
        start_speed_kmh: b.start_speed_kmh ?? 5,
        end_speed_kmh: b.end_speed_kmh ?? 5,
        start_incline_pct: b.start_incline_pct ?? 0,
        end_incline_pct: b.end_incline_pct ?? 0,
      }));

      if (data.metadata) {
        DOM.inputName.value = data.metadata.name || 'Imported Workout';
        DOM.inputDesc.value = data.metadata.description || '';
      }

      selectedId = null;
      render();
      showToast(`Imported ${intervals.length} intervals from ${file.name}`, 'success');
    } catch (err) {
      showToast('Failed to parse JSON file', 'error');
    }
  };
  reader.readAsText(file);
  DOM.fileInput.value = '';
});

// ── Export / Download ─────────────────────────────────────────

function buildPayload() {
  const stats = calcStats();
  const name = DOM.inputName.value.trim() || 'My Workout';
  const desc = DOM.inputDesc.value.trim();

  return {
    metadata: {
      name,
      description: desc,
      total_duration_seconds: stats.totalTime,
      total_distance_km: parseFloat(stats.totalDist.toFixed(2)),
      average_speed_kmh: parseFloat(stats.avgSpeed.toFixed(1)),
      average_pace: stats.avgPace ? `${stats.avgPace} /km` : null,
      total_elevation_gain_m: Math.round(stats.elevation),
    },
    intervals: intervals.map((b, i) => ({
      id: i + 1,
      type: b.type,
      duration_seconds: b.duration_seconds,
      start_speed_kmh: b.start_speed_kmh,
      end_speed_kmh: b.end_speed_kmh,
      start_incline_pct: b.start_incline_pct,
      end_incline_pct: b.end_incline_pct,
    })),
  };
}

function exportWorkout() {
  if (intervals.length === 0) return;

  const payload = buildPayload();
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(payload.metadata.name)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Sync to Cloud (GitHub PUT) ────────────────────────────────

async function syncToCloud() {
  if (intervals.length === 0) {
    showToast('Nothing to sync — add some intervals first', 'info');
    return;
  }

  const { pat, repo, path } = getSettings();
  if (!pat || !repo) {
    showToast('Configure GitHub settings first', 'error');
    openSettings();
    return;
  }

  const payload = buildPayload();
  const json = JSON.stringify(payload, null, 2);
  const content = btoa(unescape(encodeURIComponent(json)));
  const name = sanitizeFilename(payload.metadata.name);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${name}_${timestamp}.json`;

  const folder = path.replace(/^\/+|\/+$/g, '');
  const filePath = folder ? `${folder}/${filename}` : filename;

  showToast('Syncing to GitHub...', 'loading');

  try {
    const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        message: `Add workout: ${payload.metadata.name}`,
        content,
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      if (resp.status === 401) throw new Error('Unauthorized — check your PAT');
      if (resp.status === 404) throw new Error('Repository not found');
      throw new Error(err.message || `GitHub API error ${resp.status}`);
    }

    showToast(`Synced "${filename}" to ${repo}`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Collection Fetching ───────────────────────────────────────

async function fetchCollection() {
  const grid    = $('#collection-grid');
  const loading = $('#collection-loading');
  const error   = $('#collection-error');
  const empty   = $('#collection-empty');

  grid.classList.add('hidden');
  error.classList.add('hidden');
  empty.classList.add('hidden');
  loading.classList.remove('hidden');

  try {
    const resp = await fetch(`https://api.github.com/repos/${PUBLIC_REPO}/contents/${PUBLIC_PATH}`);

    if (!resp.ok) {
      if (resp.status === 404) {
        loading.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
      }
      throw new Error(`HTTP ${resp.status}`);
    }

    const files = (await resp.json()).filter(f => f.name.endsWith('.json'));
    loading.classList.add('hidden');

    if (files.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    grid.innerHTML = '';
    grid.classList.remove('hidden');

    for (const file of files) {
      grid.appendChild(buildFileCard(file, false));
    }
  } catch (err) {
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    $('#collection-error-msg').textContent = `Failed to load: ${err.message}`;
  }
}

async function fetchMyCollection() {
  const { pat, repo, path } = getSettings();
  if (!pat || !repo) return;

  const grid    = $('#my-collection-grid');
  const loading = $('#my-collection-loading');
  const error   = $('#my-collection-error');
  const empty   = $('#my-collection-empty');

  grid.classList.add('hidden');
  error.classList.add('hidden');
  empty.classList.add('hidden');
  loading.classList.remove('hidden');

  $('#my-collection-subtitle').textContent = `${repo} / ${path}`;

  const folder = path.replace(/^\/+|\/+$/g, '');
  const apiPath = folder || '';

  try {
    const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${apiPath}`, {
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!resp.ok) {
      if (resp.status === 401) throw new Error('Unauthorized — check your PAT');
      if (resp.status === 404) {
        loading.classList.add('hidden');
        empty.classList.remove('hidden');
        return;
      }
      throw new Error(`HTTP ${resp.status}`);
    }

    const data = await resp.json();
    const files = (Array.isArray(data) ? data : []).filter(f => f.name.endsWith('.json'));
    loading.classList.add('hidden');

    if (files.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    grid.innerHTML = '';
    grid.classList.remove('hidden');

    for (const file of files) {
      grid.appendChild(buildFileCard(file, true));
    }
  } catch (err) {
    loading.classList.add('hidden');
    error.classList.remove('hidden');
    $('#my-collection-error-msg').textContent = `Failed to load: ${err.message}`;
  }
}

// ── File Card Builder (simple list for now, full cards in Step 3) ──

function buildFileCard(file, isPrivate) {
  const card = document.createElement('div');
  card.className = 'workout-card fade-in';

  const name = file.name.replace(/\.json$/, '').replace(/_/g, ' ');
  const sizeKB = file.size ? (file.size / 1024).toFixed(1) : '?';

  card.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 mb-1">
          <i class="ph ph-barbell text-cyan-400 text-base flex-shrink-0"></i>
          <span class="text-sm font-semibold truncate">${name}</span>
        </div>
        <div class="flex items-center gap-3 text-[11px] text-slate-500">
          <span><i class="ph ph-file text-xs"></i> ${sizeKB} KB</span>
          ${isPrivate ? '<span class="text-violet-400/70"><i class="ph ph-lock-simple text-xs"></i> Private</span>' : '<span class="text-emerald-400/70"><i class="ph ph-globe text-xs"></i> Public</span>'}
        </div>
      </div>
      <button onclick="downloadFromUrl('${file.download_url}', '${file.name}')"
        class="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-cyan-400 transition" title="Download">
        <i class="ph ph-download-simple text-sm"></i>
      </button>
    </div>
  `;

  return card;
}

function downloadFromUrl(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast(`Downloading ${filename}`, 'info');
}

// ── Resize Observer ───────────────────────────────────────────

const resizeObserver = new ResizeObserver(() => {
  if (activeTab === 'design') renderCanvas();
});
resizeObserver.observe(wrapper);

// ── Init ──────────────────────────────────────────────────────

refreshMyCollectionTab();
render();
