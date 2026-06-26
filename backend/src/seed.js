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

  let inserted = 0;
  for (const g of games) {
    const result = await pool.query(
      `INSERT INTO games (steam_id, slug, name, released, image_url, rating, metacritic, genres, platforms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (steam_id) DO UPDATE SET
         name = EXCLUDED.name,
         image_url = EXCLUDED.image_url,
         rating = EXCLUDED.rating,
         metacritic = EXCLUDED.metacritic,
         genres = EXCLUDED.genres,
         platforms = EXCLUDED.platforms
       RETURNING id`,
      [
        g.id,
        g.slug,
        g.name,
        g.released ?? null,
        g.background_image ?? null,
        g.rating ?? null,
        g.metacritic ?? null,
        g.genres ?? [],
        g.platforms ?? [],
      ],
    );
    if (result.rowCount > 0) inserted += 1;
  }

  console.log(`Seeded ${inserted} games into the database.`);
  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
