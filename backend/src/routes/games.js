import { Router } from 'express';
import { query } from '../db.js';

export const gamesRouter = Router();

// GET /api/games?search=&genre=&limit=&offset=
// Returns games to populate the tier list pool.
gamesRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 60, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const search = (req.query.search || '').trim();
    const genre = (req.query.genre || '').trim();

    const conditions = [];
    const params = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`lower(name) LIKE $${params.length}`);
    }
    if (genre) {
      params.push(genre);
      conditions.push(`$${params.length} = ANY(genres)`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const { rows } = await query(
      `SELECT id, name, image_url, released, rating, metacritic, genres, platforms
       FROM games
       ${where}
       ORDER BY rating DESC NULLS LAST, name ASC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    res.json({ games: rows, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/games/genres -> distinct genres for filtering
gamesRouter.get('/genres', async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT DISTINCT unnest(genres) AS genre FROM games ORDER BY genre`,
    );
    res.json({ genres: rows.map((r) => r.genre).filter(Boolean) });
  } catch (err) {
    next(err);
  }
});
