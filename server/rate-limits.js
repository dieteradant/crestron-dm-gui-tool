const rateLimit = require('express-rate-limit');

// In tests we disable rate limiting to avoid timer leaks and flakiness.
if (process.env.NODE_ENV === 'test') {
  const noop = (_req, _res, next) => next();
  module.exports = { commandLimiter: noop, mutationLimiter: noop, readLimiter: noop };
  return;
}

const commandLimiter = rateLimit({
  windowMs: 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many commands, slow down' },
});

const mutationLimiter = rateLimit({
  windowMs: 2000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many mutation requests' },
});

const readLimiter = rateLimit({
  windowMs: 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { commandLimiter, mutationLimiter, readLimiter };
