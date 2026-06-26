import jwt from 'jsonwebtoken';

// Secret used to sign JWTs. Set JWT_SECRET in production (Render env var).
export const JWT_SECRET =
  process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
export const TOKEN_TTL = '30d';

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
}

// Express middleware that requires a valid Bearer token.
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

// Like requireAuth but does not fail if no token is present; just attaches
// req.user when a valid token exists. Useful for optionally-authenticated routes.
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}
