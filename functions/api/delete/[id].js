// functions/api/delete/[id].js
// DELETE /api/delete/:id
// Removes image from R2 and its record from D1. Protected by _middleware.js

export async function onRequestDelete(context) {
  const { env, params } = context;
  const { id } = params;

  if (!id) return json({ error: 'Missing id' }, 400);

  try {
    // Fetch the r2_key first
    const row = await env.DB.prepare(
      `SELECT r2_key FROM images WHERE id = ?`
    ).bind(id).first();

    if (!row) return json({ error: 'Image not found' }, 404);

    // Delete from R2
    await env.BUCKET.delete(row.r2_key);

    // Delete from D1
    await env.DB.prepare(`DELETE FROM images WHERE id = ?`).bind(id).run();

    return json({ success: true });
  } catch (err) {
    console.error('Delete error:', err);
    return json({ error: 'Delete failed' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
