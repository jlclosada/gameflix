-- Database schema for the video game tier list app.

CREATE TABLE IF NOT EXISTS games (
  id          SERIAL PRIMARY KEY,
  steam_id    INTEGER UNIQUE,
  slug        TEXT,
  name        TEXT NOT NULL,
  released    TEXT,
  image_url   TEXT,
  rating      REAL,
  metacritic  INTEGER,
  genres      TEXT[] DEFAULT '{}',
  platforms   TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_games_name ON games (lower(name));

-- A published tier list. The full tier layout is stored as JSONB so the
-- frontend can render it exactly as the author arranged it.
CREATE TABLE IF NOT EXISTS tierlists (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT DEFAULT 'Anonymous',
  category    TEXT,
  tiers       JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  views       INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tierlists_created ON tierlists (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tierlists_category ON tierlists (category);

-- One row per game placement in a published tier list. Used to compute
-- statistics (which games are most loved, tier distributions, etc.).
CREATE TABLE IF NOT EXISTS placements (
  id           SERIAL PRIMARY KEY,
  tierlist_id  INTEGER NOT NULL REFERENCES tierlists(id) ON DELETE CASCADE,
  game_id      INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  tier_label   TEXT NOT NULL,
  tier_rank    INTEGER NOT NULL,
  position     INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_placements_game ON placements (game_id);
CREATE INDEX IF NOT EXISTS idx_placements_tierlist ON placements (tierlist_id);
