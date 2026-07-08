// functions/api/edit/[id].js
// PUT /api/edit/:id
//   • application/json               → metadata-only update (backwards compatible)
//   • multipart/form-data            → metadata update + optional image replacement
// When an image is supplied it is stored under a NEW r2_key (the URL therefore
// changes, side-stepping the immutable long-cache on /img/*), the row is
// re-pointed, and the previous R2 object is cleaned up.
// Protected by _middleware.js

const ALLOWED = ['date', 'project', 'made_by', 'made_by2', 'type', 'cover_pub', 'title', 'location', 'txt'];

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { id } = params;

  if (!id) return json({ error: 'Missing id' }, 400);

  const contentType = request.headers.get('content-type') || '';

  const updates = {};
  let newImageBuffer = null;

  if (contentType.includes('multipart/form-data')) {
    let formData;
    try { formData = await request.formData(); }
    catch { return json({ error: 'Invalid form data' }, 400); }

    for (const key of ALLOWED) {
      if (formData.has(key)) updates[key] = (String(formData.get(key)).trim() || '-');
    }

    const imageFile = formData.get('image');
    if (imageFile && typeof imageFile !== 'string') {
      const buf = await imageFile.arrayBuffer();
      if (buf.byteLength > 0) newImageBuffer = buf;
    }
  } else {
    let body;
    try { body = await request.json(); }
    catch { return json({ error: 'Invalid JSON' }, 400); }

    for (const key of ALLOWED) {
      if (key in body) updates[key] = (String(body[key]).trim() || '-');
    }
  }

  if (Object.keys(updates).length === 0 && !newImageBuffer) {
    return json({ error: 'No valid fields to update' }, 400);
  }

  // ── Image replacement: write to a fresh key, re-point the row, drop the old ──
  let oldR2Key = null;
  let newR2Key = null;

  if (newImageBuffer) {
    const row = await env.DB.prepare('SELECT r2_key FROM images WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'Image not found' }, 404);
    oldR2Key = row.r2_key;
    newR2Key = `images/dr0ne-${crypto.randomUUID()}.webp`;

    try {
      await env.BUCKET.put(newR2Key, newImageBuffer, {
        httpMetadata: { contentType: 'image/webp' }
      });
    } catch (err) {
      console.error('R2 put error:', err);
      return json({ error: 'Image upload failed' }, 500);
    }

    updates.r2_key = newR2Key;
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values     = [...Object.values(updates), id];

  try {
    const result = await env.DB.prepare(
      `UPDATE images SET ${setClauses} WHERE id = ?`
    ).bind(...values).run();

    if (result.meta.changes === 0) {
      if (newR2Key) { try { await env.BUCKET.delete(newR2Key); } catch {} }
      return json({ error: 'Image not found' }, 404);
    }

    // Success → best-effort cleanup of the previous image object
    if (oldR2Key && oldR2Key !== newR2Key) {
      try { await env.BUCKET.delete(oldR2Key); } catch {}
    }

    return json({ success: true, ...(newR2Key ? { r2_key: newR2Key } : {}) });
  } catch (err) {
    console.error('Edit error:', err);
    if (newR2Key) { try { await env.BUCKET.delete(newR2Key); } catch {} }
    return json({ error: 'Database error' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
