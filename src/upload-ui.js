// src/upload-ui.js
// Upload and Edit modals

import { authHeaders } from './auth.js';

const modalOverlay = document.getElementById('modal-overlay');

// ─── Upload Modal ─────────────────────────────────────────────────────────────

export function openUploadModal() {
  modalOverlay.innerHTML = uploadModalHTML();
  modalOverlay.classList.add('open');
  attachUploadHandlers();
}

function uploadModalHTML() {
  return `
    <div class="modal" id="upload-modal">
      <h2>upload</h2>

      <div id="upload-preview-wrap">
        <img id="upload-preview" alt="preview"/>
      </div>

      <label>image</label>
      <input type="file" id="upload-file" accept="image/*">

      <label>date (YYYY)</label>
      <input type="text" id="f-date" maxlength="4" placeholder="—">

      <label>project</label>
      <select id="f-project">
        <option value="-">—</option>
        <option value="Project">Project</option>
      </select>

      <label>made by</label>
      <select id="f-made-by">
        <option value="-">—</option>
        <option value="Dr0ne">Dr0ne</option>
        <option value="Dr0ne+">Dr0ne+</option>
        <option value="external">external</option>
      </select>

      <label>made by 2</label>
      <input type="text" id="f-made-by2" placeholder="—">

      <label>type</label>
      <input type="text" id="f-type" placeholder="—">

      <label>cover</label>
      <select id="f-cover-pub">
        <option value="-">—</option>
        <option value="Cover">Cover</option>
      </select>

      <label>title</label>
      <input type="text" id="f-title" placeholder="—">

      <label>location</label>
      <input type="text" id="f-location" placeholder="—">

      <label>txt</label>
      <textarea id="f-txt" placeholder="—"></textarea>

      <div class="modal-error" id="upload-error"></div>

      <button class="btn" id="upload-submit-btn">upload</button>
      <button class="btn" id="upload-cancel-btn" style="margin-left:8px">cancel</button>
      <span class="upload-reminder" style="margin-left:8px">Correct browser for upload, Geronimo?</span>
    </div>
  `;
}

function attachUploadHandlers() {
  const fileInput   = document.getElementById('upload-file');
  const preview     = document.getElementById('upload-preview');
  const previewWrap = document.getElementById('upload-preview-wrap');
  const errorEl     = document.getElementById('upload-error');
  const submitBtn   = document.getElementById('upload-submit-btn');
  const cancelBtn   = document.getElementById('upload-cancel-btn');

  let convertedBlob = null;

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    errorEl.textContent = '';
    submitBtn.textContent = 'converting…';
    submitBtn.disabled = true;

    try {
      convertedBlob = await convertToWebP(file);
      const url = URL.createObjectURL(convertedBlob);
      preview.src = url;
      previewWrap.classList.add('has-image');
      submitBtn.textContent = 'upload';
      submitBtn.disabled = false;
    } catch (err) {
      errorEl.textContent = 'Image conversion failed.';
      submitBtn.textContent = 'upload';
      submitBtn.disabled = false;
    }
  });

  submitBtn.addEventListener('click', async () => {
    if (!convertedBlob) { errorEl.textContent = 'Please select an image.'; return; }
    errorEl.textContent = '';
    submitBtn.textContent = 'uploading…';
    submitBtn.disabled = true;

    const form = new FormData();
    form.append('image',     convertedBlob, 'image.webp');
    form.append('date',      document.getElementById('f-date').value.trim());
    form.append('project',   document.getElementById('f-project').value);
    form.append('made_by',   document.getElementById('f-made-by').value);
    form.append('made_by2',  document.getElementById('f-made-by2').value.trim());
    form.append('type',      document.getElementById('f-type').value.trim());
    form.append('cover_pub', document.getElementById('f-cover-pub').value);
    form.append('title',     document.getElementById('f-title').value.trim());
    form.append('location',  document.getElementById('f-location').value.trim());
    form.append('txt',       document.getElementById('f-txt').value.trim());

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: authHeaders(),
        body: form
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error ?? 'Upload failed');
      }

      closeModal();
      // Reload image list
      window.__reloadImages?.();
    } catch (err) {
      errorEl.textContent = err.message;
      submitBtn.textContent = 'upload';
      submitBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', closeModal);
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────

export function openEditModal(image) {
  modalOverlay.innerHTML = editModalHTML(image);
  modalOverlay.classList.add('open');
  attachEditHandlers(image.id);
}

function editModalHTML(img) {
  const v = (key) => escAttr(img[key] === '-' ? '' : img[key]);
  const sel = (key, val) => img[key] === val ? 'selected' : '';

  return `
    <div class="modal" id="edit-modal">
      <h2>edit</h2>

      <label>date (YYYY)</label>
      <input type="text" id="e-date" maxlength="4" value="${v('date')}" placeholder="—">

      <label>project</label>
      <select id="e-project">
        <option value="-"       ${sel('project','-')}>—</option>
        <option value="Project" ${sel('project','Project')}>Project</option>
      </select>

      <label>made by</label>
      <select id="e-made-by">
        <option value="-" ${sel('made_by','-')}>—</option>
        <option value="Dr0ne"    ${sel('made_by','Dr0ne')}>Dr0ne</option>
        <option value="Dr0ne+"   ${sel('made_by','Dr0ne+')}>Dr0ne+</option>
        <option value="external" ${sel('made_by','external')}>external</option>
      </select>

      <label>made by 2</label>
      <input type="text" id="e-made-by2" value="${v('made_by2')}" placeholder="—">

      <label>type</label>
      <input type="text" id="e-type" value="${v('type')}" placeholder="—">

      <label>cover</label>
      <select id="e-cover-pub">
        <option value="-"   ${sel('cover_pub','-')}>—</option>
        <option value="Cover" ${sel('cover_pub','Cover')}>Cover</option>
      </select>

      <label>title</label>
      <input type="text" id="e-title" value="${v('title')}" placeholder="—">

      <label>location</label>
      <input type="text" id="e-location" value="${v('location')}" placeholder="—">

      <label>txt</label>
      <textarea id="e-txt" placeholder="—">${escHTML(img.txt === '-' ? '' : img.txt)}</textarea>

      <div class="modal-error" id="edit-error"></div>

      <button class="btn" id="edit-save-btn">save</button>
      <button class="btn" id="edit-cancel-btn" style="margin-left:8px">cancel</button>
    </div>
  `;
}

function attachEditHandlers(id) {
  const errorEl  = document.getElementById('edit-error');
  const saveBtn  = document.getElementById('edit-save-btn');
  const cancelBtn = document.getElementById('edit-cancel-btn');

  saveBtn.addEventListener('click', async () => {
    errorEl.textContent = '';
    saveBtn.textContent = 'saving…';
    saveBtn.disabled = true;

    const body = {
      date:      document.getElementById('e-date').value.trim()      || '-',
      project:   document.getElementById('e-project').value,
      made_by:   document.getElementById('e-made-by').value,
      made_by2:  document.getElementById('e-made-by2').value.trim()  || '-',
      type:      document.getElementById('e-type').value.trim()      || '-',
      cover_pub: document.getElementById('e-cover-pub').value,
      title:     document.getElementById('e-title').value.trim()     || '-',
      location:  document.getElementById('e-location').value.trim()  || '-',
      txt:       document.getElementById('e-txt').value.trim()       || '-',
    };

    try {
      const res = await fetch(`/api/edit/${id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        throw new Error(error ?? 'Save failed');
      }
      closeModal();
      window.__reloadImages?.();
    } catch (err) {
      errorEl.textContent = err.message;
      saveBtn.textContent = 'save';
      saveBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', closeModal);
}

// ─── Shared helpers ────────────────────────────────────────────────────────────

function closeModal() {
  modalOverlay.classList.remove('open');
  modalOverlay.innerHTML = '';
}

// Convert image ≤ 1.8MB, max 2700px on the longest side
// - If already WebP and ≤ 1.8MB and ≤ 2700px: upload as-is
// - Chrome/Firefox: convert to WebP
// - Safari: convert to JPEG (Safari canvas cannot compress WebP)
// Quality ladder starts high (0.90) so the size budget is spent on
// sharpness; canvas downscaling uses high-quality resampling.
async function convertToWebP(file) {
  const MAX_PX = 2700;
  const MAX_MB = 1.8 * 1024 * 1024;

  const ua = navigator.userAgent;
  const isSafari = ua.includes('Safari') && !ua.includes('Chrome') && !ua.includes('Chromium');

  // If already WebP, small enough, and within pixel limit → return as-is
  if (file.type === 'image/webp' && file.size <= MAX_MB) {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = objectUrl; });
    URL.revokeObjectURL(objectUrl);
    if (img.naturalWidth <= MAX_PX && img.naturalHeight <= MAX_PX) return file;
  }

  const format = isSafari ? 'image/jpeg' : 'image/webp';

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = objectUrl;
  });
  URL.revokeObjectURL(objectUrl);

  let width  = img.naturalWidth;
  let height = img.naturalHeight;

  // Scale down to max 2700px on longest side
  if (width > MAX_PX || height > MAX_PX) {
    if (width >= height) {
      height = Math.round(height * MAX_PX / width);
      width  = MAX_PX;
    } else {
      width  = Math.round(width  * MAX_PX / height);
      height = MAX_PX;
    }
  }

  async function tryExport(w, h, quality) {
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);
    return new Promise(res => canvas.toBlob(res, format, quality));
  }

  // Try quality steps, highest first, until under MAX_MB
  for (const q of [0.90, 0.84, 0.78, 0.68, 0.56]) {
    const blob = await tryExport(width, height, q);
    if (blob.size <= MAX_MB) return blob;
  }

  // Still too large → reduce dimensions by 15% per step
  let w = width;
  let h = height;
  while (w > 300 && h > 300) {
    w = Math.floor(w * 0.85);
    h = Math.floor(h * 0.85);
    const blob = await tryExport(w, h, 0.75);
    if (blob.size <= MAX_MB) return blob;
  }

  return tryExport(w, h, 0.60);
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
