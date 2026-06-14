/* ============================================================
   CHRONO — Premium Stopwatch  |  script.js
   Sections:
     1. State & DOM
     2. Particle System
     3. Timer Logic
     4. Display Update
     5. Ring Animation
     6. Lap Management
     7. Stats
     8. Achievements & Confetti
     9. Controls & Events
    10. Theme / Sound / Fullscreen
    11. localStorage
    12. Init
   ============================================================ */

/* ─── 1. STATE & DOM ─── */
const state = {
  running: false,
  startTime: 0,
  elapsed: 0,
  lapStart: 0,
  laps: [],
  rafId: null,
  innerAngle: 0,
  sound: true,
  milestones: { '1m': false, '5m': false, '10m': false },
};

const $ = id => document.getElementById(id);

const dom = {
  loader:         $('loader'),
  app:            $('app'),
  segH:           $('segH'),
  segM:           $('segM'),
  segS:           $('segS'),
  timerMs:        $('timerMs'),
  statusPill:     $('statusPill'),
  statusDot:      $('statusDot'),
  statusText:     $('statusText'),
  btnStart:       $('btnStart'),
  btnStartLabel:  $('btnStartLabel'),
  iconStartPause: $('iconStartPause'),
  btnLap:         $('btnLap'),
  btnReset:       $('btnReset'),
  btnExport:      $('btnExport'),
  btnClearLaps:   $('btnClearLaps'),
  btnTheme:       $('btnTheme'),
  btnSound:       $('btnSound'),
  btnFullscreen:  $('btnFullscreen'),
  lapsList:       $('lapsList'),
  lapsEmpty:      $('lapsEmpty'),
  statTotalVal:   $('statTotalVal'),
  statFastestVal: $('statFastestVal'),
  statSlowestVal: $('statSlowestVal'),
  statAvgVal:     $('statAvgVal'),
  orbitOuter:     $('orbitOuter'),
  innerOrbit:     $('innerOrbit'),
  badge1m:        $('badge1m'),
  badge5m:        $('badge5m'),
  badge10m:       $('badge10m'),
  confettiCanvas: $('confetti'),
};

/* ─── 2. PARTICLE SYSTEM ─── */
(function initParticles() {
  const canvas = $('particles');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  const COLORS = ['rgba(108,60,247,', 'rgba(0,212,255,', 'rgba(255,149,0,'];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function spawnParticle() {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      color,
      life: Math.random() * 200 + 100,
      age: 0,
    };
  }

  function initPool() {
    particles = Array.from({ length: 90 }, spawnParticle);
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.age++;
      const fade = Math.sin((p.age / p.life) * Math.PI);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color + (p.alpha * fade) + ')';
      ctx.fill();
      if (p.age >= p.life) particles[i] = spawnParticle();
    });
    requestAnimationFrame(tick);
  }

  resize();
  initPool();
  tick();
  window.addEventListener('resize', resize);
})();

/* ─── 3. TIMER LOGIC ─── */
function now() { return performance.now(); }

function start() {
  if (state.running) return;
  state.running = true;
  state.startTime = now() - state.elapsed;
  state.lapStart = state.lapStart || state.elapsed;
  loop();
  updateStatus('running', 'RUNNING');
  dom.btnStartLabel.textContent = 'Pause';
  setPauseIcon();
  dom.btnLap.disabled = false;
  dom.btnStart.classList.remove('pulse');
  dom.innerOrbit.classList.add('spinning');
  playClick();
}

function pause() {
  if (!state.running) return;
  state.running = false;
  state.elapsed = now() - state.startTime;
  cancelAnimationFrame(state.rafId);
  updateStatus('paused', 'PAUSED');
  dom.btnStartLabel.textContent = 'Resume';
  setPlayIcon();
  dom.innerOrbit.classList.remove('spinning');
  playClick();
}

function reset() {
  state.running = false;
  cancelAnimationFrame(state.rafId);
  state.elapsed = 0;
  state.lapStart = 0;
  state.startTime = 0;
  state.innerAngle = 0;
  state.milestones = { '1m': false, '5m': false, '10m': false };
  updateDisplay(0);
  updateRing(0);
  updateStatus('', 'READY');
  dom.btnStartLabel.textContent = 'Start';
  setPlayIcon();
  dom.btnLap.disabled = true;
  dom.btnStart.classList.add('pulse');
  dom.innerOrbit.classList.remove('spinning');
  dom.innerOrbit.style.transform = '';
  playClick();
}

function loop() {
  if (!state.running) return;
  const elapsed = now() - state.startTime;
  updateDisplay(elapsed);
  updateRing(elapsed);
  checkMilestones(elapsed);
  state.rafId = requestAnimationFrame(loop);
}

/* ─── 4. DISPLAY UPDATE ─── */
let prevS = -1;

function updateDisplay(ms) {
  const total = Math.floor(ms);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1_000);
  const milli = total % 1_000;

  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  if (dom.segH.textContent !== hh) dom.segH.textContent = hh;
  if (dom.segM.textContent !== mm) dom.segM.textContent = mm;
  if (dom.segS.textContent !== ss) {
    dom.segS.textContent = ss;
    if (prevS !== s) {
      tickSegment(dom.segS);
      if (s % 10 === 0) tickSegment(dom.segM);
      prevS = s;
    }
  }
  dom.timerMs.textContent = '.' + String(milli).padStart(3, '0');
}

function tickSegment(el) {
  el.classList.remove('tick');
  void el.offsetWidth;
  el.classList.add('tick');
  setTimeout(() => el.classList.remove('tick'), 150);
}

/* ─── 5. RING ANIMATION ─── */
const OUTER_CIRC = 2 * Math.PI * 185;
const MAX_MS     = 60_000;

function updateRing(ms) {
  const progress = Math.min(ms / MAX_MS, 1);
  const offset   = OUTER_CIRC * (1 - progress);
  dom.orbitOuter.style.strokeDashoffset = offset;
}

/* ─── 6. LAP MANAGEMENT ─── */
function recordLap() {
  if (!state.running) return;
  const currentElapsed = now() - state.startTime;
  const lapTime = currentElapsed - state.lapStart;
  state.lapStart = currentElapsed;
  const lap = { n: state.laps.length + 1, time: lapTime, total: currentElapsed };
  state.laps.push(lap);
  renderLap(lap);
  updateStats();
  saveLaps();
  playClick();
}

function renderLap(lap) {
  dom.lapsEmpty.style.display = 'none';

  const card = document.createElement('div');
  card.className = 'lap-card';
  card.dataset.lapN = lap.n;

  const prev = state.laps[state.laps.length - 2];
  let deltaStr = '';
  if (prev) {
    const delta = lap.time - prev.time;
    const sign  = delta >= 0 ? '+' : '';
    deltaStr    = sign + formatTime(Math.abs(delta));
  }

  card.innerHTML = `
    <span class="lap-num">LAP ${String(lap.n).padStart(2, '0')}</span>
    <span class="lap-time">${formatTime(lap.time)}</span>
    <span class="lap-delta">${deltaStr}</span>
  `;

  dom.lapsList.prepend(card);
  highlightFastSlow();
}

function highlightFastSlow() {
  if (state.laps.length < 2) return;
  const times   = state.laps.map(l => l.time);
  const fastest = Math.min(...times);
  const slowest = Math.max(...times);

  document.querySelectorAll('.lap-card').forEach(card => {
    const n    = parseInt(card.dataset.lapN, 10);
    const lap  = state.laps[n - 1];
    card.classList.remove('lap-card--fastest', 'lap-card--slowest');
    if (lap.time === fastest) card.classList.add('lap-card--fastest');
    if (lap.time === slowest) card.classList.add('lap-card--slowest');
  });
}

function clearLaps() {
  state.laps = [];
  dom.lapsList.innerHTML = '';
  dom.lapsList.appendChild(dom.lapsEmpty);
  dom.lapsEmpty.style.display = '';
  updateStats();
  saveLaps();
  playClick();
}

function formatTime(ms) {
  const total = Math.floor(ms);
  const m = Math.floor(total / 60_000);
  const s = Math.floor((total % 60_000) / 1_000);
  const cs = Math.floor((total % 1_000) / 10);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

/* ─── 7. STATS ─── */
function updateStats() {
  const laps = state.laps;
  dom.statTotalVal.textContent = laps.length;

  if (laps.length === 0) {
    dom.statFastestVal.textContent = '—';
    dom.statSlowestVal.textContent = '—';
    dom.statAvgVal.textContent     = '—';
    return;
  }

  const times   = laps.map(l => l.time);
  const fastest = Math.min(...times);
  const slowest = Math.max(...times);
  const avg     = times.reduce((a, b) => a + b, 0) / times.length;

  dom.statFastestVal.textContent = formatTime(fastest);
  dom.statSlowestVal.textContent = formatTime(slowest);
  dom.statAvgVal.textContent     = formatTime(avg);
}

/* ─── 8. ACHIEVEMENTS & CONFETTI ─── */
function checkMilestones(ms) {
  if (!state.milestones['1m']  && ms >= 60_000)   unlockMilestone('1m',  dom.badge1m);
  if (!state.milestones['5m']  && ms >= 300_000)  unlockMilestone('5m',  dom.badge5m);
  if (!state.milestones['10m'] && ms >= 600_000)  unlockMilestone('10m', dom.badge10m);
}

function unlockMilestone(key, el) {
  state.milestones[key] = true;
  el.classList.add('earned');
  launchConfetti();
}

(function initConfetti() {
  const canvas = dom.confettiCanvas;
  const ctx    = canvas.getContext('2d');
  let pieces   = [];
  let running  = false;

  window.launchConfetti = function() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    pieces = Array.from({ length: 120 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height * 0.3 - 50,
      w:    Math.random() * 10 + 5,
      h:    Math.random() * 6 + 3,
      r:    Math.random() * Math.PI * 2,
      vx:   (Math.random() - 0.5) * 4,
      vy:   Math.random() * 4 + 2,
      vr:   (Math.random() - 0.5) * 0.2,
      color: ['#6C3CF7','#00D4FF','#FF9500','#FF4560','#FFFFFF'][Math.floor(Math.random()*5)],
      life: 180, age: 0,
    }));
    if (!running) { running = true; tick(); }
  };

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces = pieces.filter(p => p.age < p.life);
    pieces.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += 0.08; p.age++;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    if (pieces.length > 0) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
})();

/* ─── 9. CONTROLS & EVENTS ─── */
function updateStatus(cls, text) {
  dom.statusPill.className = 'status-pill' + (cls ? ' ' + cls : '');
  dom.statusText.textContent = text;
}

function setPlayIcon() {
  dom.iconStartPause.outerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" id="iconStartPause"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
}
function setPauseIcon() {
  dom.iconStartPause.outerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" id="iconStartPause"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
}

function triggerRipple(btn) {
  btn.classList.remove('ripple');
  void btn.offsetWidth;
  btn.classList.add('ripple');
}

dom.btnStart.addEventListener('click', () => {
  triggerRipple(dom.btnStart);
  state.running ? pause() : start();
});

dom.btnReset.addEventListener('click', () => {
  triggerRipple(dom.btnReset);
  reset();
});

dom.btnLap.addEventListener('click', () => {
  triggerRipple(dom.btnLap);
  recordLap();
});

dom.btnClearLaps.addEventListener('click', clearLaps);

dom.btnExport.addEventListener('click', exportLaps);

function exportLaps() {
  if (state.laps.length === 0) return;
  const lines = ['CHRONO — Lap Export', '='.repeat(30), ''];
  state.laps.forEach(l => {
    lines.push(`LAP ${String(l.n).padStart(2,'0')}  ${formatTime(l.time)}  (total: ${formatTime(l.total)})`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'chrono-laps.txt';
  a.click();
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space')  { e.preventDefault(); state.running ? pause() : start(); }
  if (e.key  === 'r' || e.key === 'R') reset();
  if (e.key  === 'l' || e.key === 'L') recordLap();
});

/* ─── 10. THEME / SOUND / FULLSCREEN ─── */
dom.btnTheme.addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('chrono-theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

dom.btnSound.addEventListener('click', () => {
  state.sound = !state.sound;
  dom.btnSound.style.opacity = state.sound ? '1' : '0.4';
});

dom.btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen();
});

let audioCtx;
function playClick() {
  if (!state.sound) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.08);
    osc.start(); osc.stop(audioCtx.currentTime + 0.08);
  } catch (_) {}
}

/* ─── 11. LOCALSTORAGE ─── */
function saveLaps() {
  try {
    localStorage.setItem('chrono-laps', JSON.stringify(state.laps));
  } catch (_) {}
}

function loadLaps() {
  try {
    const saved = localStorage.getItem('chrono-laps');
    if (!saved) return;
    const laps = JSON.parse(saved);
    if (!Array.isArray(laps) || laps.length === 0) return;
    state.laps = laps;
    dom.lapsEmpty.style.display = 'none';
    laps.forEach(lap => {
      const card = document.createElement('div');
      card.className = 'lap-card';
      card.dataset.lapN = lap.n;
      card.innerHTML = `
        <span class="lap-num">LAP ${String(lap.n).padStart(2,'0')}</span>
        <span class="lap-time">${formatTime(lap.time)}</span>
        <span class="lap-delta"></span>
      `;
      dom.lapsList.appendChild(card);
    });
    highlightFastSlow();
    updateStats();
  } catch (_) {}
}

/* ─── 12. INIT ─── */
function init() {
  if (localStorage.getItem('chrono-theme') === 'light') {
    document.body.classList.add('light');
  }
  loadLaps();
  updateRing(0);
  updateDisplay(0);
  setTimeout(() => {
    dom.loader.classList.add('hidden');
    dom.app.classList.add('visible');
  }, 1200);
}

init();
