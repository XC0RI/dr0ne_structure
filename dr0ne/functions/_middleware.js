// functions/_middleware.js
// Protects all routes under /api/upload, /api/delete, /api/edit

const PROTECTED = ['/api/upload', '/api/delete', '/api/edit'];

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);

  const needsAuth = PROTECTED.some(p => url.pathname.startsWith(p));
  if (!needsAuth) return next();

  const authHeader = request.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !(await verifyToken(token, env.JWT_SECRET))) {
    return json({ error: 'Unauthorized' }, 401);
  }

  return next();
}

// Token: base64url(payload) . base64url(HMAC-SHA256(secret, payload))
// payload = JSON.stringify({ iat: <unix ms>, exp: <unix ms + 7 days> })

async function verifyToken(token, secret) {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return false;

    const payload = JSON.parse(atob(payloadB64));
    if (Date.now() > payload.exp) return false;

    const expected = await hmacSign(secret, payloadB64);
    return expected === sigB64;
  } catch {
    return false;
  }
}

async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
