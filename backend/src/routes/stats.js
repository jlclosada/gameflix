import { Router } from 'express';
import { query } from '../db.js';

export const statsRouter = Router();

// GET /api/stats  -> aggregated statistics across all published tier lists.
statsRouter.get('/', async (_req, res, next) => {
  try {
    // Overall counters.
    const totals = await query(`
      SELECT
        (SELECT COUNT(*) FROM tierlists) AS tierlists,
        (SELECT COUNT(*) FROM placements) AS placements,
        (SELECT COUNT(DISTINCT game_id) FROM placements) AS ranked_games
    `);

    // Most loved games: highest average normalized tier rank (min 2 placements).
    const mostLoved = await query(`
      SELECT g.id, g.name, g.image_url,
             ROUND(AVG(p.tier_rank)::numeric, 1) AS avg_rank,
             COUNT(p.id) AS appearances
      FROM placements p
      JOIN games g ON g.id = p.game_id
      GROUP BY g.id
      HAVING COUNT(p.id) >= 2
      ORDER BY avg_rank DESC, appearances DESC
      LIMIT 20
    `);

    // Most divisive: highest variance in tier rank (min 3 placements).
    const mostDivisive = await query(`
      SELECT g.id, g.name, g.image_url,
             ROUND(STDDEV_POP(p.tier_rank)::numeric, 1) AS spread,
             ROUND(AVG(p.tier_rank)::numeric, 1) AS avg_rank,
             COUNT(p.id) AS appearances
      FROM placements p
      JOIN games g ON g.id = p.game_id
      GROUP BY g.id
      HAVING COUNT(p.id) >= 3
      ORDER BY spread DESC NULLS LAST
      LIMIT 20
    `);

    // Most frequently ranked games (popularity).
    const mostRanked = await query(`
      SELECT g.id, g.name, g.image_url, COUNT(p.id) AS appearances
      FROM placements p
      JOIN games g ON g.id = p.game_id
      GROUP BY g.id
      ORDER BY appearances DESC
      LIMIT 20
    `);

    // Distribution of placements by tier label.
    const tierDistribution = await query(`
      SELECT tier_label, COUNT(*) AS count
      FROM placements
      GROUP BY tier_label
      ORDER BY count DESC
    `);

    res.json({
      totals: totals.rows[0],
      mostLoved: mostLoved.rows,
      mostDivisive: mostDivisive.rows,
      mostRanked: mostRanked.rows,
      tierDistribution: tierDistribution.rows,
    });
  } catch (err) {
    next(err);
  }
});
