const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.SUPERUSER_PORT || 8090);
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'control-plane.json');
const sessions = new Map();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, expected] = String(stored).split(':');
  if (!salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(password, salt, 120000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
function initialData() {
  const password = process.env.SUPERUSER_PASSWORD || 'ChangeMeImmediately!2026';
  return {
    branding: { universityName: 'University of Dar es Salaam', shortName: 'Clearance', logoUrl: '/assets/logo.png', primaryColor: '#123c69' },
    dashboards: [
      { id: 'student', name: 'Student Clearance', description: 'Student clearance requests and status', enabled: true },
      { id: 'finance', name: 'Finance', description: 'Finance clearance workflows', enabled: true },
      { id: 'library', name: 'Library', description: 'Library clearance workflows', enabled: true },
      { id: 'transcript', name: 'Transcripts', description: 'Transcript requests and payments', enabled: true },
      { id: 'department', name: 'Department', description: 'Department review and clearance', enabled: true },
      { id: 'ict', name: 'ICT', description: 'ICT clearance workflows', enabled: true },
      { id: 'academic', name: 'Academic Staff', description: 'Academic staff clearance workflows', enabled: true },
      { id: 'administrator', name: 'Administrator', description: 'Administrative operations', enabled: true },
      { id: 'convocation', name: 'Convocation', description: 'Convocation clearance workflows', enabled: true },
      { id: 'games-coach', name: 'Games Coach', description: 'Games and sports clearance', enabled: true },
      { id: 'hall-warden', name: 'Hall Warden', description: 'Accommodation clearance workflows', enabled: true },
      { id: 'usab', name: 'USAB', description: 'USAB clearance workflows', enabled: true },
      { id: 'daruso', name: 'DARUSO', description: 'DARUSO clearance workflows', enabled: true },
      { id: 'dean-of-students', name: 'Dean of Students', description: 'Dean of Students clearance', enabled: true },
      { id: 'smart-card', name: 'Smart Card', description: 'Smart card clearance workflows', enabled: true },
      { id: 'workshop', name: 'Workshop', description: 'Workshop clearance workflows', enabled: true },
      { id: 'laboratory', name: 'Laboratory', description: 'Laboratory clearance workflows', enabled: true },
      { id: 'principal', name: 'Principal', description: 'Principal clearance workflows', enabled: true }
    ],
    subAdmins: [],
    superuser: { email: process.env.SUPERUSER_EMAIL || 'superuser@admin.local', passwordHash: hashPassword(password) }
  };
}
function readData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(initialData(), null, 2));
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  const defaults = initialData();
  data.branding = { ...defaults.branding, ...data.branding };
  data.dashboards = [...data.dashboards, ...defaults.dashboards.filter(item => !data.dashboards.some(existing => existing.id === item.id))];
  if (!data.superuser?.email) data.superuser = defaults.superuser;
  if (data.branding.shortName.toUpperCase() === 'UDSM') data.branding.shortName = 'Clearance';
  if (!data.branding.logoUrl) data.branding.logoUrl = '/assets/logo.png';
  if (data.superuser.email.toLowerCase() === 'superuser@udsm.ac.tz') data.superuser.email = 'superuser@admin.local';
  writeData(data);
  return data;
}
function writeData(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': 'http://localhost:8091', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' });
  res.end(JSON.stringify(body));
}
function body(req) { return new Promise((resolve, reject) => { let raw = ''; req.on('data', chunk => raw += chunk); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } }); }); }
function auth(req, res) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token || !sessions.has(token)) { send(res, 401, { message: 'Authentication required' }); return false; }
  return true;
}
function safeAdmin(admin) { const { passwordHash, ...safe } = admin; return safe; }
function id() { return crypto.randomUUID(); }

async function route(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const data = readData();
  try {
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const input = await body(req);
      if (input.email !== data.superuser.email || !verifyPassword(input.password, data.superuser.passwordHash)) return send(res, 401, { message: 'Invalid credentials' });
      const token = crypto.randomBytes(32).toString('hex'); sessions.set(token, { role: 'SUPERUSER', email: input.email });
      return send(res, 200, { token, user: { email: input.email, role: 'SUPERUSER' } });
    }
    if (url.pathname === '/api/public/branding' && req.method === 'GET') return send(res, 200, data.branding);
    if (!auth(req, res)) return;
    if (url.pathname === '/api/overview' && req.method === 'GET') return send(res, 200, { branding: data.branding, dashboards: data.dashboards, subAdmins: data.subAdmins.map(safeAdmin) });
    if (url.pathname === '/api/branding' && req.method === 'PUT') { const input = await body(req); data.branding = { ...data.branding, universityName: String(input.universityName || data.branding.universityName).trim(), shortName: String(input.shortName || data.branding.shortName).trim(), logoUrl: String(input.logoUrl || '').trim(), primaryColor: /^#[0-9a-f]{6}$/i.test(input.primaryColor || '') ? input.primaryColor : data.branding.primaryColor }; writeData(data); return send(res, 200, data.branding); }
    if (url.pathname === '/api/sub-admins' && req.method === 'GET') return send(res, 200, data.subAdmins.map(safeAdmin));
    if (url.pathname === '/api/sub-admins' && req.method === 'POST') { const input = await body(req); if (!input.email || !input.name || !input.password) return send(res, 400, { message: 'Name, email, and password are required' }); if (data.subAdmins.some(s => s.email === input.email)) return send(res, 409, { message: 'Email already exists' }); const admin = { id: id(), name: input.name.trim(), email: input.email.trim().toLowerCase(), passwordHash: hashPassword(input.password), permissions: Array.isArray(input.permissions) ? input.permissions : [], active: true, createdAt: new Date().toISOString() }; data.subAdmins.push(admin); writeData(data); return send(res, 201, safeAdmin(admin)); }
    const adminMatch = url.pathname.match(/^\/api\/sub-admins\/([^/]+)$/);
    if (adminMatch && ['PUT', 'DELETE'].includes(req.method)) { const index = data.subAdmins.findIndex(s => s.id === adminMatch[1]); if (index < 0) return send(res, 404, { message: 'Sub-admin not found' }); if (req.method === 'DELETE') data.subAdmins.splice(index, 1); else { const input = await body(req); data.subAdmins[index] = { ...data.subAdmins[index], name: input.name ?? data.subAdmins[index].name, permissions: Array.isArray(input.permissions) ? input.permissions : data.subAdmins[index].permissions, active: input.active ?? data.subAdmins[index].active }; } writeData(data); return send(res, 200, req.method === 'DELETE' ? { message: 'Sub-admin deleted' } : safeAdmin(data.subAdmins[index])); }
    if (url.pathname === '/api/dashboards' && req.method === 'POST') { const input = await body(req); if (!input.name || !input.id) return send(res, 400, { message: 'Dashboard id and name are required' }); if (data.dashboards.some(d => d.id === input.id)) return send(res, 409, { message: 'Dashboard id already exists' }); const dashboard = { id: input.id.toLowerCase().replace(/[^a-z0-9-]/g, '-'), name: input.name.trim(), description: String(input.description || '').trim(), enabled: input.enabled !== false }; data.dashboards.push(dashboard); writeData(data); return send(res, 201, dashboard); }
    const dashMatch = url.pathname.match(/^\/api\/dashboards\/([^/]+)$/);
    if (dashMatch && ['PUT', 'DELETE'].includes(req.method)) { const index = data.dashboards.findIndex(d => d.id === dashMatch[1]); if (index < 0) return send(res, 404, { message: 'Dashboard not found' }); if (req.method === 'DELETE') data.dashboards.splice(index, 1); else { const input = await body(req); data.dashboards[index] = { ...data.dashboards[index], name: input.name ?? data.dashboards[index].name, description: input.description ?? data.dashboards[index].description, enabled: input.enabled ?? data.dashboards[index].enabled }; } writeData(data); return send(res, 200, req.method === 'DELETE' ? { message: 'Dashboard deleted' } : data.dashboards[index]); }
    return send(res, 404, { message: 'Route not found' });
  } catch (error) { return send(res, 400, { message: error.message }); }
}
http.createServer(route).listen(PORT, () => console.log(`Superuser API listening on http://localhost:${PORT}`));
