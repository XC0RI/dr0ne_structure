// src/auth.js
// Manages authentication state: login, logout, token storage

const TOKEN_KEY = 'dr0ne_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  try {
    const [payloadB64] = token.split('.');
    const { exp } = JSON.parse(atob(payloadB64));
    return Date.now() < exp;
  } catch {
    return false;
  }
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function login(password) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(error ?? 'Login failed');
  }

  const { token } = await res.json();
  localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}
