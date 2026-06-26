import { Router } from 'express';
import { pool, query } from '../db.js';

export const tierlistsRouter = Router();

// Normalize a tier's rank to a 0-100 scale based on its position so that
// statistics are comparable across tier lists with different numbers of tiers.
function tierRank(index, totalTiers) {
  if (totalTiers <= 1) return 100;
  return Math.round(((totalTiers - 1 - index) / (totalTiers - 1)) * 100);
}

// POST /api/tierlists  -> publish a tier list
// Body: { title, author, category, tiers: [{ label, color, gameIds: [] }] }
tierlistsRouter.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { title, author, category, tiers } = req.body || {};

    if (!title || typeof title !== 'string') {
      return res
        .status(400)
        .json({ error: "A non-empty 'title' is required." });
    }
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return res
        .status(400)
        .json({ error: "'tiers' must be a non-empty array." });
    }

    const placedGameIds = tiers.flatMap((t) =>
      Array.isArray(t.gameIds) ? t.gameIds : [],
    );
    if (placedGameIds.length === 0) {
      return res
        .status(400)
        .json({ error: 'At least one game must be placed in a tier.' });
    }

    await client.query('BEGIN');

    const insertList = await client.query(
      `INSERT INTO tierlists (title, author, category, tiers)
       VALUES ($1, $2, $3, $4)
       RETURNING id, created_at`,
      [
        title.trim().slice(0, 200),
        (author || 'Anonymous').trim().slice(0, 80),
        (category || null) && category.trim().slice(0, 80),
        JSON.stringify(tiers),
      ],
    );
    const tierlistId = insertList.rows[0].id;

    const totalTiers = tiers.length;
    for (let i = 0; i < tiers.length; i += 1) {
      const tier = tiers[i];
      const rank = tierRank(i, totalTiers);
      const gameIds = Array.isArray(tier.gameIds) ? tier.gameIds : [];
      for (let pos = 0; pos < gameIds.length; pos += 1) {
        const gameId = gameIds[pos];
        if (!Number.isInteger(gameId)) continue;
        await client.query(
          `INSERT INTO placements (tierlist_id, game_id, tier_label, tier_rank, position)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            tierlistId,
            gameId,
            String(tier.label || '?').slice(0, 10),
            rank,
            pos,
          ],
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      id: tierlistId,
      created_at: insertList.rows[0].created_at,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /api/tierlists?category=&limit=&offset=  -> list published tier lists
tierlistsRouter.get('/', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const category = (req.query.category || '').trim();

    const params = [];
    let where = '';
    if (category) {
      params.push(category);
      where = `WHERE category = $${params.length}`;
    }
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const { rows } = await query(
      `SELECT id, title, author, category, created_at, views,
              jsonb_array_length(tiers) AS tier_count
       FROM tierlists
       ${where}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );
    res.json({ tierlists: rows, limit, offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/tierlists/:id -> full tier list with resolved game data
tierlistsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid id.' });
    }

    const listResult = await query(
      `SELECT id, title, author, category, tiers, created_at, views
       FROM tierlists WHERE id = $1`,
      [id],
    );
    if (listResult.rowCount === 0) {
      return res.status(404).json({ error: 'Tier list not found.' });
    }

    await query(`UPDATE tierlists SET views = views + 1 WHERE id = $1`, [id]);

    const list = listResult.rows[0];

    // Resolve every game id used in the tiers to its full record.
    const ids = (list.tiers || [])
      .flatMap((t) => (Array.isArray(t.gameIds) ? t.gameIds : []))
      .filter((x) => Number.isInteger(x));

    let gamesById = {};
    if (ids.length) {
      const gamesResult = await query(
        `SELECT id, name, image_url, released, rating, genres
         FROM games WHERE id = ANY($1)`,
        [ids],
      );
      gamesById = Object.fromEntries(gamesResult.rows.map((g) => [g.id, g]));
    }

    res.json({ ...list, gamesById });
  } catch (err) {
    next(err);
  }
});
