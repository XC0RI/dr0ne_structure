// src/collage.js
// Manages the collage: infinite forward-only scroll through random image pairs

const PRELOAD_COUNT = 4;

let allImages    = [];
let collageIndex = 0;
let busy         = false;
let archiveOpen  = false;
let wheelAccum   = 0;
let infoVisible  = true;    // global: whether frame-info is shown

export function setArchiveOpen(val) { archiveOpen = val; }

// Called from index.html hide-btn to sync global flag + DOM
export function setInfoVisible(val) {
  infoVisible = val;
  document.querySelectorAll('.frame-info-wrap').forEach(w => {
    w.classList.toggle('hidden', !val);
  });
  document.querySelectorAll('.info-toggle-btn').forEach(b => {
    b.classList.toggle('hidden', val);
  });
}

const stack = document.getElementById('collage-stack');

// ─── Init ───────────────────────────────────────────────────────────────────

export async function initCollage(images) {
  allImages = images;
  if (allImages.length === 0) return;

  showCollage(0, true);
  for (let i = 1; i < PRELOAD_COUNT; i++) preloadCollage(i);

  attachScrollListeners();
}

// ─── Collage creation ───────────────────────────────────────────────────────

function randomImage() {
  return allImages[Math.floor(Math.random() * allImages.length)];
}

function randomZoom() {
  return 1 + Math.random() * 0.30;
}

function randomOffset(zoom) {
  const maxShift = (zoom - 1) / 2 * 100;
  const x = (Math.random() - 0.5) * 2 * maxShift;
  const y = (Math.random() - 0.5) * 2 * maxShift;
  return { x, y };
}

function buildFrame(image) {
  const zoom   = randomZoom();
  const offset = randomOffset(zoom);

  const frame = document.createElement('div');
  frame.className = 'frame';

  const img = document.createElement('img');
  img.src   = `/img/${image.r2_key}`;
  img.alt   = image.title !== '-' ? image.title : '';
  img.style.cssText = [
    `transform: scale(${zoom}) translate(${offset.x}%, ${offset.y}%)`,
    `transform-origin: center center`,
  ].join('; ');

  // ── Info wrapper: left-aligned, visibility follows global flag ─────────
  const infoWrap = document.createElement('div');
  infoWrap.className = 'frame-info-wrap' + (infoVisible ? '' : ' hidden');

  const info = document.createElement('div');
  info.className = 'frame-info';
  info.innerHTML = buildInfoHTML(image);

  // − button: top-right of wrap, hides info globally
  const closeBtn = document.createElement('button');
  closeBtn.className = 'info-close-btn';
  closeBtn.textContent = '−';
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setInfoVisible(false);
  });

  infoWrap.appendChild(info);
  infoWrap.appendChild(closeBtn);

  // i button: left side of frame, shown only when info is hidden
  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'info-toggle-btn' + (infoVisible ? ' hidden' : '');
  toggleBtn.textContent = 'i';
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setInfoVisible(true);
  });

  frame.appendChild(img);
  frame.appendChild(infoWrap);
  frame.appendChild(toggleBtn);
  return frame;
}

function buildInfoHTML(img) {
  const lines = [];
  const add = (val) => {
    if (val && val !== '-') lines.push(`<p>${escHTML(val)}</p>`);
  };

  add(img.date);

  if (img.made_by === 'Dr0ne') {
    add('Dr0ne');
  } else if (img.made_by !== '-' || img.made_by2 !== '-') {
    const display = img.made_by !== '-'
      ? `${img.made_by} / ${img.made_by2}`
      : img.made_by2;
    if (display) lines.push(`<p>${escHTML(display)}</p>`);
  }

  add(img.type);
  add(img.title);
  add(img.location);
  add(img.txt);

  return lines.join('');
}

function escHTML(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Collage DOM management ──────────────────────────────────────────────────

function buildCollageEl(idx) {
  const el = document.createElement('div');
  el.className = 'collage';
  el.dataset.colIdx = idx;
  el.appendChild(buildFrame(randomImage()));
  el.appendChild(buildFrame(randomImage()));
  return el;
}

function showCollage(idx) {
  const existing = stack.querySelector(`[data-col-idx="${idx}"]`);
  const el = existing ?? buildCollageEl(idx);
  el.style.transform = 'translateY(0)';
  el.style.opacity   = '1';
  el.style.zIndex    = String(10 + idx);
  if (!existing) stack.appendChild(el);
}

function preloadCollage(idx) {
  if (stack.querySelector(`[data-col-idx="${idx}"]`)) return;
  const el = buildCollageEl(idx);
  el.style.transform = 'translateY(100%)';
  el.style.opacity   = '0';
  el.style.zIndex    = String(10 + idx);
  stack.appendChild(el);
}

function advanceCollage() {
  if (busy || allImages.length === 0 || archiveOpen) return;
  busy       = true;
  wheelAccum = 0;  // hard reset — no queuing

  const current = stack.querySelector(`[data-col-idx="${collageIndex}"]`);
  if (current) {
    current.style.transform = 'translateY(-100%)';
    current.style.opacity   = '0';
    setTimeout(() => current.remove(), 600);
  }

  collageIndex++;

  const next = stack.querySelector(`[data-col-idx="${collageIndex}"]`);
  if (next) {
    requestAnimationFrame(() => {
      next.style.transform = 'translateY(0)';
      next.style.opacity   = '1';
    });
  } else {
    showCollage(collageIndex);
  }

  for (let i = 1; i <= PRELOAD_COUNT; i++) preloadCollage(collageIndex + i);

  setTimeout(() => {
    busy       = false;
    wheelAccum = 0;  // discard anything accumulated during animation
  }, 800);
}

// ─── Scroll detection ────────────────────────────────────────────────────────

let touchStartY = 0;

function attachScrollListeners() {
  const catcher = document.createElement('div');
  catcher.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:1',
    'pointer-events:auto', 'touch-action:none'
  ].join(';');
  document.body.appendChild(catcher);

  // Wheel: if busy or archive open, drop everything — no advance queuing
  catcher.addEventListener('wheel', (e) => {
    if (archiveOpen || busy) { wheelAccum = 0; return; }
    if (e.deltaY <= 0) { wheelAccum = 0; return; }
    wheelAccum += e.deltaY;
    if (wheelAccum > 80) {
      wheelAccum = 0;
      advanceCollage();
    }
  }, { passive: true });

  catcher.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  catcher.addEventListener('touchend', (e) => {
    if (archiveOpen || busy) return;
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (delta > 60) advanceCollage();
  }, { passive: true });

  // Space / ArrowDown — blocked when archive open
  window.addEventListener('keydown', (e) => {
    if (archiveOpen) return;
    if (e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      advanceCollage();
    }
  });
}

// ─── Blur/unblur collage for archive overlay ─────────────────────────────────

export function blurCollage() {
  stack.querySelectorAll('.collage').forEach(c => c.classList.add('collage-blurred'));
}
export function unblurCollage() {
  stack.querySelectorAll('.collage').forEach(c => c.classList.remove('collage-blurred'));
}
