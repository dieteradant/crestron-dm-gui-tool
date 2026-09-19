// Shared request-handling helpers: error creation, input validation, async
// route wrapping, and a single error middleware so route handlers never
// repeat try/catch + res.status logic.

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function requirePositiveInt(value, label) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    throw httpError(400, `${label} must be a positive integer`);
  }
  return num;
}

function optionalPositiveInt(value, label) {
  if (value === undefined || value === null || value === '') return null;
  return requirePositiveInt(value, label);
}

// Values that get concatenated into CTP command lines must be a single
// token — no whitespace or control characters, so they can't smuggle
// additional commands into the device stream.
function safeToken(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._-]+$/.test(value)) {
    throw httpError(400, `${label} must be a single token (letters, digits, . _ -)`);
  }
  return value;
}

const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// eslint-disable-next-line no-unused-vars
function apiErrorMiddleware(err, req, res, next) {
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status <= 599 ? err.status : 500;
  if (status >= 500) {
    console.error(`[API] ${req.method} ${req.originalUrl}:`, err);
  }
  res.status(status).json({ error: err.message });
}

module.exports = {
  httpError,
  requirePositiveInt,
  optionalPositiveInt,
  safeToken,
  asyncHandler,
  apiErrorMiddleware,
};
