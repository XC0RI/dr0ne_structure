// src/tooltip.js
// Shared floating tooltip that shows the full text of a truncated element
// (archive table cells and collage frame-info lines) on hover.

let tipEl     = null;
let showTimer = null;

function ensureTip() {
  if (tipEl) return tipEl;
  tipEl = document.createElement('div');
  tipEl.className = 'text-tooltip';
  document.body.appendChild(tipEl);
  return tipEl;
}

function placeTip(tip, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const gap  = 8;
  const vw   = window.innerWidth;
  const vh   = window.innerHeight;

  // Reset so offsetWidth/Height reflect natural size before clamping
  tip.style.left = '0px';
  tip.style.top  = '0px';
  const tw = tip.offsetWidth;
  const th = tip.offsetHeight;

  let left = rect.left;
  let top  = rect.bottom + gap;

  if (top + th > vh - gap) top = rect.top - gap - th;   // flip above if needed
  if (top < gap)            top = gap;
  if (left + tw > vw - gap) left = vw - gap - tw;
  if (left < gap)           left = gap;

  tip.style.left = `${Math.round(left)}px`;
  tip.style.top  = `${Math.round(top)}px`;
}

// Show the tooltip after a short hover delay
export function showTextTooltip(text, anchorEl, delay = 140) {
  clearTimeout(showTimer);
  if (!text) return;
  showTimer = setTimeout(() => {
    const tip = ensureTip();
    tip.textContent   = text;
    tip.style.display = 'block';
    placeTip(tip, anchorEl);
  }, delay);
}

export function hideTextTooltip() {
  clearTimeout(showTimer);
  if (tipEl) tipEl.style.display = 'none';
}
