// Base URL for the API. In development Vite proxies /api to the backend.
// In production set VITE_API_URL to your deployed backend URL.
const API_BASE = import.meta.env.VITE_API_URL || '';

const TOKEN_KEY = 'gametier_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // ignore JSON parse errors
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Auth
  register: (payload) =>
    request(`/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload) =>
    request(`/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  me: () => request(`/api/auth/me`),
  myReviews: () => request(`/api/auth/me/reviews`),

  // Games
  getGames: ({
    search = '',
    genre = '',
    limit = 60,
    offset = 0,
    sort = '',
  } = {}) => {
    const params = new URLSearchParams({ limit, offset });
    if (search) params.set('search', search);
    if (genre) params.set('genre', genre);
    if (sort) params.set('sort', sort);
    return request(`/api/games?${params.toString()}`);
  },
  getGenres: () => request(`/api/games/genres`),
  getGame: (id) => request(`/api/games/${id}`),
  saveReview: (id, payload) =>
    request(`/api/games/${id}/reviews`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteReview: (id) =>
    request(`/api/games/${id}/reviews`, { method: 'DELETE' }),

  // Tier lists
  publishTierlist: (payload) =>
    request(`/api/tierlists`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getTierlists: ({ category = '', limit = 20, offset = 0 } = {}) => {
    const params = new URLSearchParams({ limit, offset });
    if (category) params.set('category', category);
    return request(`/api/tierlists?${params.toString()}`);
  },
  getTierlist: (id) => request(`/api/tierlists/${id}`),

  // Stats
  getStats: () => request(`/api/stats`),
};
