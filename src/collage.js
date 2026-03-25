// src/collage.js
// Manages the collage: infinite forward-only scroll through random image pairs

const PRELOAD_COUNT = 4;   // how many collages to keep ready ahead

let allImages    = [];      // full image list from D1
let collageIndex = 0;       // how many collages have been shown
let busy         = false;   // prevents scroll spamming
let archiveOpen  = false;   // blocks collage scroll when archive is visible

export function setArchiveOpen(val) { archiveOpen = val; }

const stack = document.getElementById('collage-stack');

// ─── Init ───────────────────────────────────────────────────────────────────

export async function initCollage(images) {
  allImages = images;
  if (allImages.length === 0) return;

  // First collage visible, preload the rest
  showCollage(0, true);
  for (let i = 1; i < PRELOAD_COUNT; i++) preloadCollage(i);

  attachScrollListeners();
}

// ─── Collage creation ───────────────────────────────────────────────────────

function randomImage() {
  return allImages[Math.floor(Math.random() * allImages.length)];
}

function randomZoom() {
  // 1.00 – 1.30, two decimal places
  return 1 + Math.random() * 0.30;
}

function randomOffset(zoom) {
  // Maximum shift so image still covers frame (zoom - 1) / 2 per side
  const maxShift = (zoom - 1) / 2 * 100; // in %
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

  const info = document.createElement('div');
  info.className = 'frame-info';
  info.innerHTML = buildInfoHTML(image);

  frame.appendChild(img);
  frame.appendChild(info);
  return frame;
}

function buildInfoHTML(img) {
  const lines = [];

  const add = (val) => {
    if (val && val !== '-') lines.push(`<p>${escHTML(val)}</p>`);
  };

  add(img.date);

  // made_by / made_by2 logic
  if (img.made_by === 'Dr0ne') {
    add('Dr0ne');
  } else {
    const combined = [img.made_by, img.made_by2].filter(v => v && v !== '-').join(' / ');
    // If made_by is - but made_by2 is also -, show nothing. Otherwise show combined.
    if (img.made_by !== '-' || img.made_by2 !== '-') {
      const display = img.made_by !== '-'
        ? `${img.made_by} / ${img.made_by2}`   // always show both (even if made_by2 = -)
        : img.made_by2;
      if (display) lines.push(`<p>${escHTML(display)}</p>`);
    }
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
  const el  = document.createElement('div');
  el.className = 'collage';
  el.dataset.colIdx = idx;

  const img1 = randomImage();
  const img2 = randomImage();

  el.appendChild(buildFrame(img1));
  el.appendChild(buildFrame(img2));

  return el;
}

function showCollage(idx, immediate = false) {
  const existing = stack.querySelector(`[data-col-idx="${idx}"]`);
  const el = existing ?? buildCollageEl(idx);

  el.style.transform  = 'translateY(0)';
  el.style.opacity    = '1';
  el.style.zIndex     = String(10 + idx);

  if (!existing) stack.appendChild(el);
}

function preloadCollage(idx) {
  if (stack.querySelector(`[data-col-idx="${idx}"]`)) return;
  const el = buildCollageEl(idx);
  el.style.transform  = 'translateY(100%)';
  el.style.opacity    = '0';
  el.style.zIndex     = String(10 + idx);
  stack.appendChild(el);
}

function advanceCollage() {
  if (busy || allImages.length === 0 || archiveOpen) return;
  busy = true;

  const current = stack.querySelector(`[data-col-idx="${collageIndex}"]`);

  // Animate current out upwards
  if (current) {
    current.style.transform = 'translateY(-100%)';
    current.style.opacity   = '0';
    setTimeout(() => current.remove(), 600);
  }

  collageIndex++;

  // Show next (was preloaded at translateY(100%))
  const next = stack.querySelector(`[data-col-idx="${collageIndex}"]`);
  if (next) {
    requestAnimationFrame(() => {
      next.style.transform = 'translateY(0)';
      next.style.opacity   = '1';
    });
  } else {
    showCollage(collageIndex);
  }

  // Preload further ahead
  for (let i = 1; i <= PRELOAD_COUNT; i++) preloadCollage(collageIndex + i);

  setTimeout(() => { busy = false; }, 800);
}

// ─── Scroll detection ────────────────────────────────────────────────────────

let touchStartY = 0;

function attachScrollListeners() {
  // One wheel event → one collage, then blocked until animation completes
  // Listen on document to ensure Mac trackpad events are captured immediately
  document.addEventListener('wheel', (e) => {
    if (archiveOpen) return;
    if (e.deltaY > 3) advanceCollage();  // small threshold filters micro-movements
  }, { passive: true });

  // Touch swipe up
  window.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    const delta = touchStartY - e.changedTouches[0].clientY;
    if (delta > 60) advanceCollage();
  }, { passive: true });

  // Keyboard arrow down / space (blocked when archive is open)
  window.addEventListener('keydown', (e) => {
    if (archiveOpen) return;
    if (e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault();
      advanceCollage();
    }
  });
}

// ─── Blur/unblur collage for archive overlay ─────────────────────────────────

export function blurCollage()   {
  stack.querySelectorAll('.collage').forEach(c => c.classList.add('collage-blurred'));
}
export function unblurCollage() {
  stack.querySelectorAll('.collage').forEach(c => c.classList.remove('collage-blurred'));
}
