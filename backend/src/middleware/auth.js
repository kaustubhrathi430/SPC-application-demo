const crypto = require('crypto');
const bcrypt = require('bcryptjs');

// Session store (in-memory — cleared on server restart, which is fine for on-premise)
// Sessions are keyed by token, value is { role, username, createdAt }
const sessions = new Map();
const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours (full shift)

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (stored.startsWith('$2')) {
    return bcrypt.compareSync(password, stored);
  }
  const [, salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

// Clean expired sessions periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now - session.createdAt > SESSION_TIMEOUT_MS) {
      sessions.delete(token);
    }
  }
}, 60 * 60 * 1000); // Cleanup every hour

// Create a session and return the token
function createSession(role, username) {
  const token = generateToken();
  sessions.set(token, { role, username, createdAt: Date.now() });
  return token;
}

// Get session from request cookie
function getSession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/spc_session=([a-f0-9]+)/);
  if (!match) return null;

  const token = match[1];
  const session = sessions.get(token);
  if (!session) return null;

  // Check expiry
  if (Date.now() - session.createdAt > SESSION_TIMEOUT_MS) {
    sessions.delete(token);
    return null;
  }

  return session;
}

// Middleware: require admin (admin OR master)
function requireAdmin(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (session.role !== 'admin' && session.role !== 'master') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  req.session = session;
  next();
}

// Middleware: require master only
function requireMaster(req, res, next) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (session.role !== 'master') {
    return res.status(403).json({ error: 'Master owner access required' });
  }
  req.session = session;
  next();
}

// Middleware: optional auth (attaches session if present, doesn't block)
function optionalAuth(req, res, next) {
  req.session = getSession(req);
  next();
}

// Set session cookie on response
function setSessionCookie(res, token) {
  // httpOnly, SameSite=Strict, no Secure (on-premise HTTP)
  res.setHeader('Set-Cookie', `spc_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TIMEOUT_MS / 1000}`);
}

// Clear session cookie
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'spc_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
}

// Destroy session by request
function destroySession(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/spc_session=([a-f0-9]+)/);
  if (match) {
    sessions.delete(match[1]);
  }
}

module.exports = {
  createSession,
  getSession,
  requireAdmin,
  requireMaster,
  optionalAuth,
  setSessionCookie,
  clearSessionCookie,
  destroySession,
  verifyPassword,
  hashPassword,
};
