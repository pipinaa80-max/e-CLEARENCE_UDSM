const crypto = require('crypto');

/**
 * Server-side In-Flight GET Coalescing Middleware
 *
 * When multiple simultaneous identical GET requests arrive for the same
 * authenticated session (e.g. multiple browser tabs, rapid reloads, or
 * parallel component mounts), only ONE database query executes; the other
 * concurrent requests await the same in-flight JSON response.
 *
 * Binary streams, downloads, certificates, exports, and non-GET requests are
 * bypassed completely.
 */
const inFlightGets = new Map();

function shouldBypass(req) {
  if (req.method !== 'GET') return true;
  const url = String(req.originalUrl || req.url || '').toLowerCase();
  return (
    url.includes('/download') ||
    url.includes('/certificate/') ||
    url.includes('/my-certificate') ||
    url.includes('/export/') ||
    url.includes('/qr/generate') ||
    url.includes('/uploads/')
  );
}

function buildKey(req) {
  const auth = req.headers.authorization || '';
  const authHash = auth
    ? crypto.createHash('sha256').update(auth).digest('hex').slice(0, 16)
    : 'anon';
  return `${authHash}::${req.originalUrl || req.url}`;
}

function coalesceGetMiddleware(req, res, next) {
  if (shouldBypass(req)) {
    return next();
  }

  const key = buildKey(req);
  const existing = inFlightGets.get(key);

  if (existing) {
    existing.promise
      .then((captured) => {
        if (res.headersSent) return;
        if (captured && captured.handledAsJson) {
          return res.status(captured.statusCode).json(captured.body);
        }
        // Leader responded with non-JSON or errored; let follower execute normally
        return next();
      })
      .catch(() => {
        if (!res.headersSent) next();
      });
    return;
  }

  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  const entry = { promise, settled: false };
  const settle = (payload) => {
    if (entry.settled) return;
    entry.settled = true;
    inFlightGets.delete(key);
    resolvePromise(payload);
  };

  inFlightGets.set(key, entry);

  const originalJson = res.json.bind(res);
  res.json = function patchedJson(body) {
    settle({
      handledAsJson: true,
      statusCode: res.statusCode || 200,
      body
    });
    return originalJson(body);
  };

  res.on('finish', () => settle({ handledAsJson: false }));
  res.on('close', () => settle({ handledAsJson: false }));

  return next();
}

coalesceGetMiddleware._inFlightCount = () => inFlightGets.size;

module.exports = coalesceGetMiddleware;
