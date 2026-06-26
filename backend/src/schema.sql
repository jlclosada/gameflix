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
  platforms   TEXT[] DEFAULT '{}',
  popularity  INTEGER
);

-- Popularity rank (lower = more popular). Added for existing tables.
ALTER TABLE games ADD COLUMN IF NOT EXISTS popularity INTEGER;

CREATE INDEX IF NOT EXISTS idx_games_name ON games (lower(name));

-- Fast catalog ordering: most popular games first.
CREATE INDEX IF NOT EXISTS idx_games_popularity ON games (popularity ASC NULLS LAST);

-- Trigram index for fast case-insensitive substring search (LIKE '%term%').
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_games_name_trgm ON games USING gin (lower(name) gin_trgm_ops);

-- GIN index for fast genre filtering (genre = ANY(genres)).
CREATE INDEX IF NOT EXISTS idx_games_genres ON games USING gin (genres);

-- Registered users. Passwords are stored as bcrypt hashes.
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (lower(username));

-- A published tier list. The full tier layout is stored as JSONB so the
-- frontend can render it exactly as the author arranged it.
CREATE TABLE IF NOT EXISTS tierlists (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  author      TEXT DEFAULT 'Anonymous',
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category    TEXT,
  tiers       JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  views       INTEGER DEFAULT 0
);

-- Add user_id to existing tierlists tables (no-op if it already exists).
ALTER TABLE tierlists ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tierlists_created ON tierlists (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tierlists_category ON tierlists (category);
CREATE INDEX IF NOT EXISTS idx_tierlists_user ON tierlists (user_id);

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

-- User reviews: one star rating (1-5) and optional comment per (user, game).
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  game_id     INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (game_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_game ON reviews (game_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews (user_id);

