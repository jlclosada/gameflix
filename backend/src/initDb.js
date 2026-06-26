// Creates the database tables defined in schema.sql.
// Run with: npm run init-db
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  console.log('Applying schema...');
  await pool.query(schema);
  console.log('Schema applied successfully.');
  await pool.end();
}

main().catch((err) => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
