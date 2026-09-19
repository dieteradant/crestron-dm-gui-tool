// Shared Express helpers: error creation, async route wrapping, and a single
// error middleware so route handlers never repeat try/catch + res.status logic.

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
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

module.exports = { httpError, asyncHandler, apiErrorMiddleware };
