// functions/api/upload.js
// POST /api/upload  (multipart/form-data)
// Fields: image (File — any format, converted to WebP client-side before sending),
//         date, made_by, made_by2, type, first_pub, title, location, txt
// Protected by _middleware.js

export async function onRequestPost(context) {
  const { request, env } = context;

  let formData;
  try { formData = await request.formData(); }
  catch { return json({ error: 'Invalid form data' }, 400); }

  const imageFile = formData.get('image');
  if (!imageFile || typeof imageFile === 'string') {
    return json({ error: 'No image provided' }, 400);
  }

  const imageBuffer = await imageFile.arrayBuffer();

  if (imageBuffer.byteLength === 0) {
    return json({ error: 'Image is empty' }, 400);
  }

  // Generate unique ID and R2 key
  const id    = crypto.randomUUID();
  const r2Key = `images/dr0ne-${id}.webp`;
  const now   = new Date().toISOString();

  // Read metadata fields (all optional, default to '-')
  const get = (key) => (formData.get(key) ?? '').trim() || '-';

  const meta = {
    date:      get('date'),
    made_by:   get('made_by'),
    made_by2:  get('made_by2'),
    type:      get('type'),
    first_pub: formData.get('first_pub') === '1st' ? '1st' : '-',
    title:     get('title'),
    location:  get('location'),
    txt:       get('txt'),
  };

  try {
    // 1. Store image in R2
    await env.BUCKET.put(r2Key, imageBuffer, {
      httpMetadata: { contentType: 'image/webp' }
    });

    // 2. Store metadata in D1
    await env.DB.prepare(
      `INSERT INTO images
        (id, uploaded_at, r2_key, date, made_by, made_by2, type, first_pub, title, location, txt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, now, r2Key,
      meta.date, meta.made_by, meta.made_by2, meta.type,
      meta.first_pub, meta.title, meta.location, meta.txt
    ).run();

    return json({ success: true, id, r2_key: r2Key });
  } catch (err) {
    console.error('Upload error:', err);
    // Attempt R2 cleanup if D1 failed
    try { await env.BUCKET.delete(r2Key); } catch {}
    return json({ error: 'Upload failed' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}