const http = require('node:http');

const PORT = Number(process.env.SUPERUSER_PORT || 8090);
const BACKEND_URL = process.env.CLEARANCE_BACKEND_URL || 'http://localhost:8080/api/v1/control-plane';

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    ...headers
  });
  res.end(body);
}

async function route(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  const path = new URL(req.url, `http://localhost:${PORT}`).pathname.replace(/^\/api/, '');
  const target = `${BACKEND_URL}${path}`;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  try {
    const response = await fetch(target, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {})
      },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks)
    });
    const contentType = response.headers.get('content-type') || 'application/json';
    const payload = await response.text();
    return send(res, response.status, payload, { 'Content-Type': contentType });
  } catch (error) {
    return send(res, 502, JSON.stringify({
      message: 'Clearance backend is unavailable',
      detail: error.message
    }));
  }
}

http.createServer(route).listen(PORT, () => {
  console.log(`Superuser API proxy listening on http://localhost:${PORT}`);
});
