// functions/api/edit/[id].js
// PUT /api/edit/:id  { field: value, ... }
// Updates metadata for a single image. Protected by _middleware.js

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const { id } = params;

  if (!id) return json({ error: 'Missing id' }, 400);

  let body;
  try { body = await request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  // Allowed fields to update (never allow r2_key or id or uploaded_at)
  const ALLOWED = ['date', 'made_by', 'made_by2', 'type', 'first_pub', 'title', 'location', 'txt'];

  const updates = {};
  for (const key of ALLOWED) {
    if (key in body) {
      updates[key] = (String(body[key]).trim() || '-');
    }
  }

  if (Object.keys(updates).length === 0) {
    return json({ error: 'No valid fields to update' }, 400);
  }

  const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values     = [...Object.values(updates), id];

  try {
    const result = await env.DB.prepare(
      `UPDATE images SET ${setClauses} WHERE id = ?`
    ).bind(...values).run();

    if (result.meta.changes === 0) {
      return json({ error: 'Image not found' }, 404);
    }

    return json({ success: true });
  } catch (err) {
    console.error('Edit error:', err);
    return json({ error: 'Database error' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
