// Base URL for the API. In development Vite proxies /api to the backend.
// In production set VITE_API_URL to your deployed backend URL.
const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }
  return res.json();
}

export const api = {
  getGames: ({ search = '', genre = '', limit = 60, offset = 0 } = {}) => {
    const params = new URLSearchParams({ limit, offset });
    if (search) params.set('search', search);
    if (genre) params.set('genre', genre);
    return request(`/api/games?${params.toString()}`);
  },
  getGenres: () => request(`/api/games/genres`),
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
  getStats: () => request(`/api/stats`),
};
