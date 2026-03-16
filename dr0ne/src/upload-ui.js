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

      <label>1st</label>
      <select id="f-first-pub">
        <option value="-">—</option>
        <option value="1st">1st</option>
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
    form.append('made_by',   document.getElementById('f-made-by').value);
    form.append('made_by2',  document.getElementById('f-made-by2').value.trim());
    form.append('type',      document.getElementById('f-type').value.trim());
    form.append('first_pub', document.getElementById('f-first-pub').value);
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

      <label>1st</label>
      <select id="e-first-pub">
        <option value="-"   ${sel('first_pub','-')}>—</option>
        <option value="1st" ${sel('first_pub','1st')}>1st</option>
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
      made_by:   document.getElementById('e-made-by').value,
      made_by2:  document.getElementById('e-made-by2').value.trim()  || '-',
      type:      document.getElementById('e-type').value.trim()      || '-',
      first_pub: document.getElementById('e-first-pub').value,
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

// Convert any image File to WebP ≤ 1 MB using Canvas
async function convertToWebP(file, maxMB = 1) {
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = rej;
    img.src = objectUrl;
  });
  URL.revokeObjectURL(objectUrl);

  const canvas = document.createElement('canvas');
  canvas.width  = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);

  const MAX = maxMB * 1024 * 1024;
  let quality = 0.92;
  let blob;

  do {
    blob = await new Promise(res => canvas.toBlob(res, 'image/webp', quality));
    quality = Math.max(0.1, quality - 0.06);
  } while (blob.size > MAX && quality > 0.1);

  return blob;
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escHTML(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
