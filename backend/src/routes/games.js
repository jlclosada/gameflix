import { Router } from 'express';
import { optionalAuth, requireAuth } from '../auth.js';
import { query } from '../db.js';

export const gamesRouter = Router();

// GET /api/games?search=&genre=&limit=&offset=&sort=
// Returns games to populate the tier list pool.
gamesRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 60, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const search = (req.query.search || '').trim();
    const genre = (req.query.genre || '').trim();

    // Whitelisted sort orders (avoids SQL injection on ORDER BY).
    const SORTS = {
      popular: 'popularity ASC NULLS LAST, rating DESC NULLS LAST, name ASC',
      rating:
        'rating DESC NULLS LAST, total_reviews DESC NULLS LAST, popularity ASC NULLS LAST',
      reviews: 'total_reviews DESC NULLS LAST, popularity ASC NULLS LAST',
      name: 'name ASC',
    };
    const orderBy = SORTS[req.query.sort] || SORTS.popular;

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

    // Total for pagination. When there are no filters (the common "browse all"
    // case) a real COUNT(*) scans the whole table, so we use Postgres' fast row
    // estimate instead. Filtered counts are cheap thanks to the trigram/GIN
    // indexes.
    let total;
    if (!conditions.length) {
      const est = await query(
        `SELECT reltuples::bigint AS total FROM pg_class WHERE relname = 'games'`,
      );
      total = Number(est.rows[0]?.total) || 0;
    } else {
      const countResult = await query(
        `SELECT COUNT(*)::int AS total FROM games ${where}`,
        params,
      );
      total = countResult.rows[0].total;
    }

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const { rows } = await query(
      `SELECT id, name, image_url, released, rating, metacritic, genres, platforms, total_reviews
       FROM games
       ${where}
       ORDER BY ${orderBy}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    res.json({ games: rows, total, limit, offset });
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

// GET /api/games/:id -> full game detail with review summary and reviews.
// When authenticated, also returns the caller's own review (if any).
gamesRouter.get('/:id', optionalAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id.' });
    }

    const gameResult = await query(
      `SELECT id, steam_id, slug, name, released, image_url, rating, metacritic, genres, platforms, total_reviews
       FROM games WHERE id = $1`,
      [id],
    );
    if (gameResult.rowCount === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    const summaryResult = await query(
      `SELECT COUNT(*)::int AS count, ROUND(AVG(rating)::numeric, 2) AS average
       FROM reviews WHERE game_id = $1`,
      [id],
    );

    const reviewsResult = await query(
      `SELECT r.id, r.rating, r.comment, r.created_at, r.updated_at,
              u.id AS user_id, u.username
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.game_id = $1
       ORDER BY r.updated_at DESC
       LIMIT 100`,
      [id],
    );

    // Times this game was placed in published tier lists (popularity signal).
    const placementResult = await query(
      `SELECT COUNT(*)::int AS placements FROM placements WHERE game_id = $1`,
      [id],
    );

    let myReview = null;
    if (req.user?.id) {
      const mine = reviewsResult.rows.find((r) => r.user_id === req.user.id);
      myReview = mine || null;
    }

    res.json({
      game: gameResult.rows[0],
      summary: {
        count: summaryResult.rows[0].count,
        average: summaryResult.rows[0].average
          ? Number(summaryResult.rows[0].average)
          : null,
      },
      placements: placementResult.rows[0].placements,
      reviews: reviewsResult.rows,
      myReview,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/games/:id/reviews -> create or update the caller's review.
// Body: { rating: 1-5, comment?: string }
gamesRouter.post('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id.' });
    }
    const rating = parseInt(req.body?.rating, 10);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
    }
    const comment =
      typeof req.body?.comment === 'string'
        ? req.body.comment.trim().slice(0, 2000)
        : null;

    const exists = await query(`SELECT 1 FROM games WHERE id = $1`, [id]);
    if (exists.rowCount === 0) {
      return res.status(404).json({ error: 'Game not found.' });
    }

    const { rows } = await query(
      `INSERT INTO reviews (game_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (game_id, user_id) DO UPDATE SET
         rating = EXCLUDED.rating,
         comment = EXCLUDED.comment,
         updated_at = now()
       RETURNING id, rating, comment, created_at, updated_at`,
      [id, req.user.id, rating, comment || null],
    );

    res.status(201).json({
      review: { ...rows[0], user_id: req.user.id, username: req.user.username },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/games/:id/reviews -> remove the caller's review.
gamesRouter.delete('/:id/reviews', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id.' });
    }
    await query(`DELETE FROM reviews WHERE game_id = $1 AND user_id = $2`, [
      id,
      req.user.id,
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
