// functions/api/images.js
// GET /api/images
// Returns all image records from D1, sorted by uploaded_at DESC (newest first)
// Public endpoint — no auth required

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      `SELECT
        id, uploaded_at, r2_key,
        date, made_by, made_by2, type, first_pub,
        title, location, txt
       FROM images
       ORDER BY uploaded_at DESC`
    ).all();

    return json({ images: results ?? [] });
  } catch (err) {
    console.error('DB error:', err);
    return json({ error: 'Database error' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}
