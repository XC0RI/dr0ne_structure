// src/archive.js
// Renders the archive table, handles click-to-filter, and admin row actions

import { isLoggedIn, authHeaders } from './auth.js';

let allImages   = [];
let activeFilters = {};    // { columnKey: value }

const overlay   = document.getElementById('archive-overlay');
const filterBar = document.getElementById('filter-bar');
const tableBody = document.getElementById('archive-tbody');
const adminBar  = document.getElementById('admin-bar');

// ─── Open / close ────────────────────────────────────────────────────────────

export function openArchive(images) {
  allImages = images;
  activeFilters = {};
  renderTable();
  renderFilterBar();
  renderAdminBar();
  overlay.classList.add('open');
}

export function closeArchive() {
  overlay.classList.remove('open');
}

// ─── Render ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'thumb',     label: '0',        filterable: false },
  { key: 'position',  label: 'position',  filterable: true  },
  { key: 'date',      label: 'date',      filterable: true  },
  { key: 'made_by',   label: 'made by',   filterable: true  },
  { key: 'made_by2',  label: 'made by2',  filterable: true  },
  { key: 'type',      label: 'type',      filterable: true  },
  { key: 'first_pub', label: '1st',       filterable: true  },
  { key: 'title',     label: 'title',     filterable: true  },
  { key: 'location',  label: 'location',  filterable: true  },
  { key: 'txt',       label: 'txt',       filterable: true  },
];

function filteredImages() {
  if (Object.keys(activeFilters).length === 0) return allImages;
  return allImages.filter(img =>
    Object.entries(activeFilters).every(([key, val]) => getCellValue(img, key) === val)
  );
}

function getCellValue(img, key) {
  if (key === 'first_pub') return img.first_pub ?? '-';
  return img[key] ?? '-';
}

function renderTable() {
  const visible = filteredImages();
  tableBody.innerHTML = '';

  visible.forEach((img, posIdx) => {
    const tr = document.createElement('tr');

    COLUMNS.forEach(col => {
      const td = document.createElement('td');
      td.className = col.key;

      if (col.key === 'thumb') {
        const thumb = document.createElement('img');
        thumb.src   = `/img/${img.r2_key}`;
        thumb.alt   = '';
        td.appendChild(thumb);
        td.addEventListener('click', () => closeArchive());    // Thumb → close archive

      } else if (col.key === 'position') {
        td.textContent = posIdx + 1;

      } else {
        const val = getCellValue(img, col.key);
        td.textContent = val;
      }

      if (col.filterable && col.key !== 'position') {
        td.addEventListener('click', () => {
          const val = getCellValue(img, col.key);
          if (val === '-') return;
          setFilter(col.key, val);
        });
      }

      tr.appendChild(td);
    });

    // Admin: edit + delete buttons appended as last td
    if (isLoggedIn()) {
      const adminTd = document.createElement('td');
      adminTd.style.whiteSpace = 'nowrap';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn';
      editBtn.textContent = 'edit';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.__openEditModal(img);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.textContent = 'del';
      delBtn.style.marginLeft = '6px';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteImage(img.id);
      });

      adminTd.appendChild(editBtn);
      adminTd.appendChild(delBtn);
      tr.appendChild(adminTd);
    }

    tableBody.appendChild(tr);
  });
}

function renderFilterBar() {
  filterBar.innerHTML = '';
  Object.entries(activeFilters).forEach(([key, val]) => {
    const badge = document.createElement('span');
    badge.className = 'filter-badge';
    const colLabel = COLUMNS.find(c => c.key === key)?.label ?? key;
    badge.textContent = `${colLabel}: ${val}  ×`;
    badge.addEventListener('click', () => removeFilter(key));
    filterBar.appendChild(badge);
  });
}

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

// ─── Filter management ────────────────────────────────────────────────────────

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

// ─── Delete ───────────────────────────────────────────────────────────────────

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
