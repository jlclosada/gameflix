// Loads the games.json manifest produced by the Python downloader into the
// `games` table. Run with: npm run seed
// Optionally pass a path: node src/seed.js /path/to/games.json
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_MANIFEST = resolve(__dirname, '../../downloader/data/games.json');

async function main() {
  const manifestPath = process.argv[2]
    ? resolve(process.argv[2])
    : DEFAULT_MANIFEST;

  if (!existsSync(manifestPath)) {
    console.error(`Manifest not found: ${manifestPath}`);
    console.error('Run the Python downloader first to generate games.json.');
    process.exit(1);
  }

  const games = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  console.log(`Loaded ${games.length} games from ${manifestPath}`);

  // Batch the upserts into multi-row INSERT statements. One round-trip per
  // game over the network is painfully slow for thousands of rows, so we group
  // them (default 500 per statement) which is dramatically faster.
  const COLS = 11;
  const BATCH = 500;
  let inserted = 0;

  for (let start = 0; start < games.length; start += BATCH) {
    const chunk = games.slice(start, start + BATCH);
    const values = [];
    const params = [];
    chunk.forEach((g, i) => {
      const b = i * COLS;
      values.push(
        `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},$${b + 11})`,
      );
      params.push(
        g.id,
        g.slug,
        g.name,
        g.released ?? null,
        g.background_image ?? null,
        g.rating ?? null,
        g.metacritic ?? null,
        g.genres ?? [],
        g.platforms ?? [],
        g.popularity ?? null,
        g.total_reviews ?? null,
      );
    });

    const result = await pool.query(
      `INSERT INTO games (steam_id, slug, name, released, image_url, rating, metacritic, genres, platforms, popularity, total_reviews)
       VALUES ${values.join(',')}
       ON CONFLICT (steam_id) DO UPDATE SET
         name = EXCLUDED.name,
         image_url = EXCLUDED.image_url,
         rating = EXCLUDED.rating,
         metacritic = EXCLUDED.metacritic,
         genres = EXCLUDED.genres,
         platforms = EXCLUDED.platforms,
         popularity = EXCLUDED.popularity,
         total_reviews = EXCLUDED.total_reviews`,
      params,
    );
    inserted += result.rowCount;
    console.log(
      `  Upserted ${Math.min(start + BATCH, games.length)}/${games.length}...`,
    );
  }

  console.log(`Seeded ${inserted} games into the database.`);
  // Refresh planner statistics so the fast row-count estimate is accurate.
  await pool.query('ANALYZE games');
  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
