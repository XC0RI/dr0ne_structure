// src/collage.js
// Manages the collage: infinite forward-only scroll through random image pairs

import { showTextTooltip, hideTextTooltip } from './tooltip.js';

const PRELOAD_COUNT = 4;

let allImages    = [];
let collageIndex = 0;
let busy         = false;
let archiveOpen  = false;
let wheelAccum   = 0;
let infoVisible  = true;    // global: whether frame-info is shown

export function setArchiveOpen(val) { archiveOpen = val; }

// Sets info visibility globally — updates all existing DOM elements + flag for new frames
export function setInfoVisible(val) {
  infoVisible = val;
  document.querySelectorAll('.frame-info-wrap').forEach(w => w.classList.toggle('hidden', !val));
  if (val) requestAnimationFrame(retruncateAll);   // lines weren't measurable while hidden
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

  // ── Info wrap: positioned at original corners via CSS ─────────────────
  const infoWrap = document.createElement('div');
  infoWrap.className = 'frame-info-wrap' + (infoVisible ? '' : ' hidden');

  const info = document.createElement('div');
  info.className = 'frame-info';
  buildInfoLines(image).forEach(text => {
    const p = document.createElement('p');
    p.textContent   = text;     // full text initially; truncated after layout
    p.dataset.full  = text;
    p.addEventListener('mouseenter', () => {
      if (p.classList.contains('truncated')) showTextTooltip(p.dataset.full, p);
    });
    p.addEventListener('mouseleave', hideTextTooltip);
    info.appendChild(p);
  });
  infoWrap.appendChild(info);

  frame.appendChild(img);
  frame.appendChild(infoWrap);

  // Truncate info lines once the frame has a measurable width.
  // Frames may be appended off-screen (translateY) and not laid out for a tick,
  // so retry across a few frames until clientWidth is available.
  let tries = 0;
  const tryTruncate = () => {
    if (frame.clientWidth > 0) { truncateFrame(frame); return; }
    if (tries++ < 30) requestAnimationFrame(tryTruncate);
  };
  requestAnimationFrame(tryTruncate);

  return frame;
}

function buildInfoLines(img) {
  const lines = [];
  const add = (val) => {
    // Show every category, including ones whose value is '-'
    lines.push((val === undefined || val === null || val === '') ? '-' : val);
  };

  add(img.date);

  if (img.made_by === 'Dr0ne') {
    add('Dr0ne');
  } else {
    // Combine the two author fields; keep '-' visible instead of dropping it
    add(`${img.made_by ?? '-'} / ${img.made_by2 ?? '-'}`);
  }

  add(img.type);
  add(img.title);
  add(img.location);
  add(img.txt);

  return lines;
}

// ─── Info truncation (no line breaks, max half the image width, "…") ─────────

// Hidden span used to measure natural text width independent of layout/clipping
let measureEl = null;
function getMeasurer(refEl) {
  if (!measureEl) {
    measureEl = document.createElement('span');
    measureEl.style.cssText =
      'position:absolute;left:-99999px;top:-99999px;visibility:hidden;' +
      'white-space:nowrap;pointer-events:none;';
    document.body.appendChild(measureEl);
  }
  const cs = getComputedStyle(refEl);
  measureEl.style.font          = cs.font;
  measureEl.style.fontFamily    = cs.fontFamily;
  measureEl.style.fontSize      = cs.fontSize;
  measureEl.style.fontWeight    = cs.fontWeight;
  measureEl.style.letterSpacing = cs.letterSpacing;
  return measureEl;
}

function textWidth(refEl, text) {
  const m = getMeasurer(refEl);
  m.textContent = text;
  return m.getBoundingClientRect().width;
}

function truncateLine(p, maxPx) {
  const full = p.dataset.full ?? p.textContent;
  p.textContent = full;
  p.classList.remove('truncated');

  if (maxPx <= 0) return;                       // not measurable yet
  if (textWidth(p, full) <= maxPx) return;      // fits in full → no ellipsis

  // Binary search for the longest prefix that still fits once "…" is appended
  let lo = 0;
  let hi = full.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textWidth(p, full.slice(0, mid).trimEnd() + '…') <= maxPx) lo = mid;
    else hi = mid - 1;
  }
  p.textContent = (full.slice(0, lo).trimEnd() || full.slice(0, 1)) + '…';
  p.classList.add('truncated');
}

function truncateFrame(frame) {
  const maxPx = frame.clientWidth * 0.5;
  if (maxPx <= 0) return;   // frame not laid out yet; will retry via rAF/resize
  frame.querySelectorAll('.frame-info p').forEach(p => truncateLine(p, maxPx));
}

function retruncateAll() {
  document.querySelectorAll('.collage .frame').forEach(truncateFrame);
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
  wheelAccum = 0;
  hideTextTooltip();

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
    wheelAccum = 0;
  }, 800);
}

// ─── Scroll detection ────────────────────────────────────────────────────────

let touchStartY = 0;

function attachScrollListeners() {
  // Listeners live on window (not a fullscreen catcher) so that the collage
  // info text can receive hover events while scrolling still works everywhere.
  window.addEventListener('wheel', (e) => {
    if (archiveOpen || busy) { wheelAccum = 0; return; }
    if (e.deltaY <= 0) { wheelAccum = 0; return; }
    wheelAccum += e.deltaY;
    if (wheelAccum > 80) {
      wheelAccum = 0;
      advanceCollage();
    }
  }, { passive: true });

  window.addEventListener('touchstart', (e) => {
    if (e.touches[0]) touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (archiveOpen || busy) return;
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (delta > 60) advanceCollage();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (archiveOpen) return;
    if (e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      advanceCollage();
    }
  });

  // Re-truncate info lines when the available width changes
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    hideTextTooltip();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(retruncateAll, 120);
  });

  // Re-measure once the custom font has loaded (metrics change vs. fallback)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(retruncateAll));
  }
}

// ─── Blur/unblur collage for archive overlay ─────────────────────────────────

export function blurCollage() {
  stack.querySelectorAll('.collage').forEach(c => c.classList.add('collage-blurred'));
}
export function unblurCollage() {
  stack.querySelectorAll('.collage').forEach(c => c.classList.remove('collage-blurred'));
}
