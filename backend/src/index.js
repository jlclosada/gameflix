import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { authRouter } from './routes/auth.js';
import { gamesRouter } from './routes/games.js';
import { statsRouter } from './routes/stats.js';
import { tierlistsRouter } from './routes/tierlists.js';

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(
  cors({
    origin:
      corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/games', gamesRouter);
app.use('/api/tierlists', tierlistsRouter);
app.use('/api/stats', statsRouter);

// 404 handler.
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

// Centralized error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('API error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
