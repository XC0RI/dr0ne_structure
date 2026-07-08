// src/archive.js
// Renders the archive table, handles click-to-filter, alpha sort, hover preview, and admin row actions

import { isLoggedIn, authHeaders } from './auth.js';
import { showTextTooltip, hideTextTooltip } from './tooltip.js';

let allImages     = [];
let activeFilters = {};
let alphaSort     = null;

const overlay   = document.getElementById('archive-overlay');
const filterBar = document.getElementById('filter-bar');
const tableBody = document.getElementById('archive-tbody');
const adminBar  = document.getElementById('admin-bar');

if (overlay) overlay.addEventListener('scroll', hideTextTooltip, { passive: true });

// ─── Open / close ─────────────────────────────────────────────────────────────

export function openArchive(images) {
  allImages     = images;
  activeFilters = {};
  alphaSort     = null;
  renderTable();
  renderFilterBar();
  renderAdminBar();

  document.body.style.overflow = 'hidden';

  overlay.classList.add('open');
  overlay.style.opacity       = '0';
  overlay.style.pointerEvents = 'none';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity       = '1';
      overlay.style.pointerEvents = 'auto';
    });
  });
}

export function closeArchive() {
  hideTextTooltip();
  overlay.style.opacity       = '0';
  overlay.style.pointerEvents = 'none';
  setTimeout(() => overlay.classList.remove('open'), 500);
  document.body.style.overflow = '';
}

// ─── Columns ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'thumb',     label: '0',         filterable: false, sortable: false },
  { key: 'position',  label: 'position',  filterable: false, sortable: false },
  { key: 'date',      label: 'date',      filterable: true,  sortable: true  },
  { key: 'project',   label: 'project',   filterable: true,  sortable: true  },
  { key: 'made_by',   label: 'made by',   filterable: true,  sortable: true  },
  { key: 'made_by2',  label: 'made by2',  filterable: true,  sortable: true  },
  { key: 'type',      label: 'type',      filterable: true,  sortable: true  },
  { key: 'cover_pub', label: 'cover',     filterable: true,  sortable: true  },
  { key: 'title',     label: 'title',     filterable: true,  sortable: true  },
  { key: 'location',  label: 'location',  filterable: true,  sortable: true  },
  { key: 'txt',       label: 'txt',       filterable: true,  sortable: true  },
];

// ─── Data helpers ──────────────────────────────────────────────────────────────

function getCellValue(img, key) {
  if (key === 'cover_pub') return img.cover_pub ?? '-';
  return img[key] ?? '-';
}

function filteredImages() {
  let list = allImages;
  if (Object.keys(activeFilters).length > 0) {
    list = list.filter(img =>
      Object.entries(activeFilters).every(([key, val]) => getCellValue(img, key) === val)
    );
  }
  if (alphaSort) {
    list = [...list].sort((a, b) => {
      const av = getCellValue(a, alphaSort);
      const bv = getCellValue(b, alphaSort);
      if (av === '-' && bv === '-') return 0;
      if (av === '-') return 1;
      if (bv === '-') return -1;
      return av.toLowerCase().localeCompare(bv.toLowerCase());
    });
  }
  return list;
}

// ─── Render table header ───────────────────────────────────────────────────────

export function renderTableHeader() {
  const thead = document.getElementById('archive-thead');
  if (!thead) return;
  thead.innerHTML = '';

  const table = document.getElementById('archive-table');
  const existing = table.querySelector('colgroup');
  if (existing) existing.remove();

  const colDefs = [
    'col-thumb', 'col-position', 'col-date', 'col-project', 'col-made-by', 'col-made-by2',
    'col-type', 'col-cover', 'col-title', 'col-location', 'col-txt', 'col-admin'
  ];
  const colgroup = document.createElement('colgroup');
  colDefs.forEach(cls => {
    const col = document.createElement('col');
    col.className = cls;
    colgroup.appendChild(col);
  });
  table.insertBefore(colgroup, thead);

  const tr = document.createElement('tr');
  COLUMNS.forEach(col => {
    const th = document.createElement('th');
    th.className   = col.key;
    th.textContent = col.label;
    if (col.sortable) {
      th.style.cursor = 'pointer';
      th.title = `Sort by ${col.label} alphabetically`;
      th.addEventListener('click', () => {
        alphaSort = alphaSort === col.key ? null : col.key;
        renderTable();
        renderFilterBar();
      });
    }
    // The "0" thumbnail-column header is the (discreet) admin login trigger.
    if (col.key === 'thumb') {
      th.style.cursor = 'pointer';
      th.title = 'Login';
      th.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isLoggedIn() && typeof window.__showLoginModal === 'function') {
          window.__showLoginModal();
        }
      });
    }
    tr.appendChild(th);
  });

  const adminTh = document.createElement('th');
  adminTh.className = 'admin-col';
  tr.appendChild(adminTh);
  thead.appendChild(tr);
}

// ─── Render table body ─────────────────────────────────────────────────────────

function renderTable() {
  hideTextTooltip();
  const visible = filteredImages();
  const total   = visible.length;
  tableBody.innerHTML = '';

  const table = document.getElementById('archive-table');
  if (table) {
    const loggedIn = isLoggedIn();
    table.classList.toggle('admin-mode', loggedIn);
    const adminCol = table.querySelector('col.col-admin');
    if (adminCol) adminCol.style.width = loggedIn ? '44px' : '0';
  }

  visible.forEach((img, posIdx) => {
    const tr = document.createElement('tr');

    COLUMNS.forEach(col => {
      const td = document.createElement('td');
      td.className = col.key;

      if (col.key === 'thumb') {
        const thumb = document.createElement('img');
        thumb.src = `/img/${img.r2_key}`;
        thumb.alt = '';
        td.appendChild(thumb);

        // Hover preview only — no click-to-close
        td.addEventListener('mouseenter', () => showPreview(img.r2_key));
        td.addEventListener('mouseleave', hidePreview);
        td.addEventListener('touchstart', (e) => {
          e.preventDefault();
          showPreview(img.r2_key);
        }, { passive: false });
        td.addEventListener('touchend',    hidePreview);
        td.addEventListener('touchcancel', hidePreview);

      } else if (col.key === 'position') {
        td.textContent = total - posIdx;

      } else {
        const val = getCellValue(img, col.key);

        // Multi-line columns clamp inside an inner wrapper; others are plain text
        const multiline = col.key === 'title' || col.key === 'txt' || col.key === 'made_by2';
        let measureEl = td;
        if (multiline) {
          const clamp = document.createElement('div');
          clamp.className = 'clamp';
          clamp.textContent = val;
          td.appendChild(clamp);
          measureEl = clamp;
        } else {
          td.textContent = val;
        }

        if (col.filterable) {
          td.addEventListener('click', () => toggleFilter(col.key, val));
        }
        // Show full text on hover when the cell is truncated
        // (5-line clamp on title/txt/made_by2, or single-line ellipsis elsewhere)
        td.addEventListener('mouseenter', () => {
          const clipped =
            measureEl.scrollHeight - measureEl.clientHeight > 1 ||
            measureEl.scrollWidth  - measureEl.clientWidth  > 1;
          if (clipped) showTextTooltip(val, td);
        });
        td.addEventListener('mouseleave', hideTextTooltip);
      }

      tr.appendChild(td);
    });

    if (isLoggedIn()) {
      const adminTd = document.createElement('td');
      adminTd.className = 'admin-col';

      const editBtn = document.createElement('button');
      editBtn.className = 'admin-icon-btn';
      editBtn.title     = 'edit';
      editBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="7" y1="10" x2="17" y2="10"/><line x1="7" y1="14" x2="17" y2="14"/></svg>`;
      editBtn.addEventListener('click', (e) => { e.stopPropagation(); window.__openEditModal(img); });

      const delBtn = document.createElement('button');
      delBtn.className = 'admin-icon-btn';
      delBtn.title     = 'delete';
      delBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="8" x2="16" y2="16"/><line x1="16" y1="8" x2="8" y2="16"/></svg>`;
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteImage(img.id); });

      adminTd.appendChild(editBtn);
      adminTd.appendChild(delBtn);
      tr.appendChild(adminTd);
    }

    tableBody.appendChild(tr);
  });
}

// ─── Filter bar ────────────────────────────────────────────────────────────────

function renderFilterBar() {
  filterBar.innerHTML = '';

  // Shorten long filter values (e.g. txt) for display; the stored filter
  // value in activeFilters stays intact, so filtering is unaffected.
  const MAX_FILTER_LABEL = 40;
  const shortenValue = (str) => {
    const s = String(str);
    return s.length > MAX_FILTER_LABEL ? s.slice(0, MAX_FILTER_LABEL).trimEnd() + '…' : s;
  };

  Object.entries(activeFilters).forEach(([key, val]) => {
    const badge = document.createElement('span');
    badge.className   = 'filter-badge';
    const colLabel    = COLUMNS.find(c => c.key === key)?.label ?? key;
    const fullValue   = String(val).replace(/\s+/g, ' ').trim();   // paragraphs → spaces
    badge.textContent = `${colLabel}: ${shortenValue(val)}  ×`;
    badge.addEventListener('click', () => removeFilter(key));
    // Full value on hover via the shared dark tooltip (matches the archive
    // table + collage tooltips), only when the label was actually shortened.
    if (String(val).length > MAX_FILTER_LABEL) {
      badge.addEventListener('mouseenter', () => showTextTooltip(fullValue, badge));
      badge.addEventListener('mouseleave', hideTextTooltip);
    }
    filterBar.appendChild(badge);
  });

  if (alphaSort) {
    const badge = document.createElement('span');
    badge.className   = 'filter-badge';
    const colLabel    = COLUMNS.find(c => c.key === alphaSort)?.label ?? alphaSort;
    badge.textContent = `${colLabel} in alphabetical order  ×`;
    badge.addEventListener('click', () => {
      alphaSort = null;
      renderTable();
      renderFilterBar();
    });
    filterBar.appendChild(badge);
  }
}

// ─── Admin bar ─────────────────────────────────────────────────────────────────

function renderAdminBar() {
  if (!adminBar) return;
  adminBar.innerHTML = '';
  if (!isLoggedIn()) return;

  const uploadBtn = document.createElement('button');
  uploadBtn.className   = 'btn';
  uploadBtn.textContent = '+ upload';
  uploadBtn.addEventListener('click', () => window.__openUploadModal());

  const logoutBtn = document.createElement('button');
  logoutBtn.className   = 'btn';
  logoutBtn.textContent = 'logout';
  logoutBtn.addEventListener('click', () => {
    import('./auth.js').then(({ logout }) => {
      logout();
      renderAdminBar();
      renderTable();
    });
  });

  adminBar.appendChild(uploadBtn);
  adminBar.appendChild(logoutBtn);
}

// ─── Filter management ─────────────────────────────────────────────────────────

function setFilter(key, value) {
  activeFilters[key] = value;
  renderTable();
  renderFilterBar();
}

// Click a cell whose value is already the active filter → remove it;
// otherwise apply it. Mirrors the toggle behaviour of the category sort.
function toggleFilter(key, value) {
  if (activeFilters[key] === value) {
    removeFilter(key);
  } else {
    setFilter(key, value);
  }
}

function removeFilter(key) {
  delete activeFilters[key];
  renderTable();
  renderFilterBar();
}

// ─── Hover preview ─────────────────────────────────────────────────────────────

let previewEl = null;

function showPreview(r2Key) {
  hidePreview();

  const img = document.createElement('img');
  img.src = `/img/${r2Key}`;
  img.style.cssText = `
    position: fixed; z-index: 300; display: none;
    box-shadow: 0 4px 32px rgba(0,0,0,0.7);
    pointer-events: none; object-fit: contain;
  `;

  img.onload = () => {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const targetArea = (sw * sh) / 6;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    let scale = Math.sqrt(targetArea / (iw * ih));
    let w = iw * scale;
    let h = ih * scale;

    const maxW = sw * (10 / 12);
    const maxH = sh * (10 / 12);
    if (w > maxW) { scale = maxW / iw; w = maxW; h = ih * scale; }
    if (h > maxH) { scale = maxH / ih; h = maxH; w = iw * scale; }

    img.style.width   = `${Math.round(w)}px`;
    img.style.height  = `${Math.round(h)}px`;
    img.style.left    = `${Math.round((sw - w) / 2)}px`;
    img.style.top     = `${Math.round((sh - h) / 2)}px`;
    img.style.display = 'block';
  };

  document.body.appendChild(img);
  previewEl = img;
}

function hidePreview() {
  if (previewEl) { previewEl.remove(); previewEl = null; }
}

// ─── Delete ────────────────────────────────────────────────────────────────────

async function deleteImage(id) {
  if (!confirm('Delete this image permanently?')) return;
  try {
    const res = await fetch(`/api/delete/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error('Delete failed');
    allImages = allImages.filter(img => img.id !== id);
    renderTable();
    renderFilterBar();
  } catch (err) {
    alert(err.message);
  }
}
