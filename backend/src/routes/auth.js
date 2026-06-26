import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { requireAuth, signToken } from '../auth.js';
import { query } from '../db.js';

export const authRouter = Router();

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(row) {
  return { id: row.id, username: row.username, email: row.email };
}

// POST /api/auth/register  { username, email, password }
authRouter.post('/register', async (req, res, next) => {
  try {
    const username = (req.body?.username || '').trim();
    const email = (req.body?.email || '').trim().toLowerCase();
    const password = req.body?.password || '';

    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: 'El usuario debe tener 3-20 caracteres (letras, números, _).',
      });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Email no válido.' });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    const exists = await query(
      `SELECT 1 FROM users WHERE lower(username) = lower($1) OR email = $2`,
      [username, email],
    );
    if (exists.rowCount > 0) {
      return res
        .status(409)
        .json({ error: 'Ese usuario o email ya está registrado.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email`,
      [username, email, passwordHash],
    );
    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login  { identifier (username or email), password }
authRouter.post('/login', async (req, res, next) => {
  try {
    const identifier = (req.body?.identifier || req.body?.username || '')
      .trim()
      .toLowerCase();
    const password = req.body?.password || '';

    if (!identifier || !password) {
      return res
        .status(400)
        .json({ error: 'Introduce usuario/email y contraseña.' });
    }

    const result = await query(
      `SELECT id, username, email, password_hash
       FROM users
       WHERE lower(username) = $1 OR email = $1`,
      [identifier],
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  -> current user (requires token)
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, username, email FROM users WHERE id = $1`,
      [req.user.id],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    next(err);
  }
});
