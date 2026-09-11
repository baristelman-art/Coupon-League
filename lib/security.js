import crypto from 'crypto';

export function hashValue(value) {
  const salt = (process.env.ANTHROPIC_API_KEY || 'fallback-salt').slice(0, 12);
  return crypto.createHash('sha256').update(salt + ':' + value).digest('hex');
}

export function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}
