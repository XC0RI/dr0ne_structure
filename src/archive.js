// src/archive.js
// Renders the archive table, handles click-to-filter, alpha sort, hover preview, and admin row actions

import { isLoggedIn, authHeaders } from './auth.js';

let allImages     = [];
let activeFilters = {};   // { columnKey: value }
let alphaSort     = null; // column key currently sorted alphabetically, or null

const overlay   = document.getElementById('archive-overlay');
const filterBar = document.getElementById('filter-bar');
const tableBody = document.getElementById('archive-tbody');
const adminBar  = document.getElementById('admin-bar');

// ─── Open / close ─────────────────────────────────────────────────────────────

export function openArchive(images) {
  allImages     = images;
  activeFilters = {};
  alphaSort     = null;
  renderTable();
  renderFilterBar();
  renderAdminBar();

  // Prevent body scroll bleed-through
  document.body.style.overflow = 'hidden';

  // Animate in: display first, then opacity
  overlay.style.display  = 'block';
  overlay.style.opacity  = '0';
  overlay.style.pointerEvents = 'none';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.style.opacity  = '1';
      overlay.style.pointerEvents = 'auto';
    });
  });
}

export function closeArchive() {
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  setTimeout(() => {
    overlay.style.display = 'none';
  }, 500);
  document.body.style.overflow = '';
}

// ─── Columns definition ────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'thumb',     label: '0',         filterable: false, sortable: false },
  { key: 'position',  label: 'position',  filterable: false, sortable: false },
  { key: 'date',      label: 'date',      filterable: true,  sortable: true  },
  { key: 'made_by',   label: 'made by',   filterable: true,  sortable: true  },
  { key: 'made_by2',  label: 'made by2',  filterable: true,  sortable: true  },
  { key: 'type',      label: 'type',      filterable: true,  sortable: true  },
  { key: 'first_pub', label: '1st',       filterable: true,  sortable: true  },
  { key: 'title',     label: 'title',     filterable: true,  sortable: true  },
  { key: 'location',  label: 'location',  filterable: true,  sortable: true  },
  { key: 'txt',       label: 'txt',       filterable: true,  sortable: true  },
];

// ─── Data helpers ──────────────────────────────────────────────────────────────

function getCellValue(img, key) {
  if (key === 'first_pub') return img.first_pub ?? '-';
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
      const av = getCellValue(a, alphaSort).toLowerCase();
      const bv = getCellValue(b, alphaSort).toLowerCase();
      return av.localeCompare(bv);
    });
  }
  return list;
}

// ─── Render table header ───────────────────────────────────────────────────────

export function renderTableHeader() {
  const thead = document.getElementById('archive-thead');
  if (!thead) return;
  thead.innerHTML = '';
  const tr = document.createElement('tr');

  COLUMNS.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;

    if (col.sortable) {
      th.style.cursor = 'pointer';
      th.title = `Sort by ${col.label} alphabetically`;
      th.addEventListener('click', () => {
        if (alphaSort === col.key) {
          // Toggle off
          alphaSort = null;
        } else {
          alphaSort = col.key;
        }
        renderTable();
        renderFilterBar();
      });
    }

    tr.appendChild(th);
  });

  // Extra th for admin column
  tr.appendChild(document.createElement('th'));
  thead.appendChild(tr);
}

// ─── Render table body ─────────────────────────────────────────────────────────

function renderTable() {
  const visible = filteredImages();
  const total   = visible.length;
  tableBody.innerHTML = '';

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

        // Click: close archive
        td.addEventListener('click', () => closeArchive());

        // Hover preview (desktop)
        td.addEventListener('mouseenter', () => showPreview(img.r2_key, td));
        td.addEventListener('mouseleave', hidePreview);

        // Touch preview (mobile) — prevent scroll on this cell
        td.addEventListener('touchstart', (e) => {
          e.preventDefault();
          showPreview(img.r2_key, td);
        }, { passive: false });
        td.addEventListener('touchend',   hidePreview);
        td.addEventListener('touchcancel', hidePreview);

      } else if (col.key === 'position') {
        // 1 at bottom, n at top
        td.textContent = total - posIdx;

      } else {
        const val = getCellValue(img, col.key);
        td.textContent = val;

        if (col.filterable) {
          td.addEventListener('click', () => setFilter(col.key, val));
        }
      }

      tr.appendChild(td);
    });

    // Admin buttons
    if (isLoggedIn()) {
      const adminTd = document.createElement('td');
      adminTd.style.whiteSpace = 'nowrap';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn';
      editBtn.textContent = 'edit';
      editBtn.addEventListener('click', (e) => { e.stopPropagation(); window.__openEditModal(img); });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.textContent = 'del';
      delBtn.style.marginLeft = '6px';
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

  // Active value filters
  Object.entries(activeFilters).forEach(([key, val]) => {
    const badge = document.createElement('span');
    badge.className = 'filter-badge';
    const colLabel = COLUMNS.find(c => c.key === key)?.label ?? key;
    badge.textContent = `${colLabel}: ${val}  ×`;
    badge.addEventListener('click', () => removeFilter(key));
    filterBar.appendChild(badge);
  });

  // Active alpha sort badge
  if (alphaSort) {
    const badge = document.createElement('span');
    badge.className = 'filter-badge';
    const colLabel = COLUMNS.find(c => c.key === alphaSort)?.label ?? alphaSort;
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
  uploadBtn.className = 'btn';
  uploadBtn.textContent = '+ upload';
  uploadBtn.addEventListener('click', () => window.__openUploadModal());

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'btn';
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

function removeFilter(key) {
  delete activeFilters[key];
  renderTable();
  renderFilterBar();
}

// ─── Hover preview ─────────────────────────────────────────────────────────────

let previewEl = null;

function showPreview(r2Key, anchorEl) {
  hidePreview();

  const img = document.createElement('img');
  img.src = `/img/${r2Key}`;
  img.style.cssText = `
    position: fixed;
    z-index: 300;
    display: none;
    box-shadow: 0 4px 32px rgba(0,0,0,0.7);
    pointer-events: none;
    object-fit: contain;
  `;

  img.onload = () => {
    const sw = window.innerWidth;
    const sh = window.innerHeight;
    const targetArea = (sw * sh) / 6;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Scale to target area
    let scale = Math.sqrt(targetArea / (iw * ih));
    let w = iw * scale;
    let h = ih * scale;

    // Clamp to 10/12 of screen
    const maxW = sw * (10 / 12);
    const maxH = sh * (10 / 12);
    if (w > maxW) { scale = maxW / iw; w = maxW; h = ih * scale; }
    if (h > maxH) { scale = maxH / ih; h = maxH; w = iw * scale; }

    img.style.width  = `${Math.round(w)}px`;
    img.style.height = `${Math.round(h)}px`;
    img.style.left   = `${Math.round((sw - w) / 2)}px`;
    img.style.top    = `${Math.round((sh - h) / 2)}px`;
    img.style.display = 'block';
  };

  document.body.appendChild(img);
  previewEl = img;
}

function hidePreview() {
  if (previewEl) {
    previewEl.remove();
    previewEl = null;
  }
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