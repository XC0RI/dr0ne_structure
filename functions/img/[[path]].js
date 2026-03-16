// functions/img/[...path].js
// GET /img/images/{id}.webp
// Proxies image files from R2 to the browser with caching

export async function onRequestGet(context) {
  const { env, params } = context;

  // params.path is an array of path segments
  const key = Array.isArray(params.path) ? params.path.join('/') : params.path;
  if (!key) return new Response('Not found', { status: 404 });

  try {
    const object = await env.BUCKET.get(key);
    if (!object) return new Response('Not found', { status: 404 });

    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType ?? 'image/webp');
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('ETag', object.etag ?? '');

    return new Response(object.body, { headers });
  } catch (err) {
    console.error('Image serve error:', err);
    return new Response('Error', { status: 500 });
  }
}
