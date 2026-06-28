// Censo / Registro — servidor sin dependencias (Node 22+).
// Almacenamiento: node:sqlite. Auth: contraseña compartida + cookie de sesión.
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const PASSWORD = process.env.ACCESS_PASSWORD || 'kidsalive2026';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'censo.db');

const db = new DatabaseSync(DB_PATH);
db.exec(`CREATE TABLE IF NOT EXISTS citizens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT, last_name TEXT, birth_date TEXT,
  age_years TEXT, age_months TEXT, gender TEXT, id_document TEXT, nationality TEXT,
  address TEXT, city TEXT, state_province TEXT, landmark TEXT,
  contact_name TEXT, relationship TEXT, contact_id_document TEXT, contact_occupation TEXT,
  phone_primary TEXT, phone_alternate TEXT, email TEXT,
  height_cm TEXT, weight_kg TEXT, blood_type TEXT,
  allergies TEXT, allergies_detail TEXT,
  medical_condition TEXT, medical_condition_detail TEXT,
  medication TEXT, medication_detail TEXT, vaccination TEXT,
  attends_school TEXT, education_level TEXT, grade TEXT, institution TEXT,
  geo_lat REAL, geo_lng REAL, geo_accuracy REAL,
  created_at TEXT, ip TEXT, user_agent TEXT
)`);

const FIELDS = ['first_name','last_name','birth_date','age_years','age_months','gender','id_document','nationality','address','city','state_province','landmark','contact_name','relationship','contact_id_document','contact_occupation','phone_primary','phone_alternate','email','height_cm','weight_kg','blood_type','allergies','allergies_detail','medical_condition','medical_condition_detail','medication','medication_detail','vaccination','attends_school','education_level','grade','institution','geo_lat','geo_lng','geo_accuracy'];

const insertStmt = db.prepare(
  `INSERT INTO citizens (${FIELDS.join(',')},created_at,ip,user_agent) VALUES (${FIELDS.map(()=>'?').join(',')},?,?,?)`
);

// --- sesiones en memoria (un solo proceso). ponytail: Map basta; persistir si escala ---
const sessions = new Set();
function newSession(res) {
  const tok = crypto.randomBytes(32).toString('hex');
  sessions.add(tok);
  res.setHeader('Set-Cookie', `sid=${tok}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`);
}
function isAuthed(req) {
  const c = req.headers.cookie || '';
  const m = c.match(/(?:^|;\s*)sid=([a-f0-9]+)/);
  return m && sessions.has(m[1]);
}
function checkPassword(input) {
  const a = Buffer.from(input || '');
  const b = Buffer.from(PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function send(res, code, body, type = 'text/html; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type });
  res.end(body);
}
function servePage(res, file) {
  fs.readFile(path.join(__dirname, 'public', file), (err, data) => {
    if (err) return send(res, 500, 'Error cargando página');
    send(res, 200, data);
  });
}
function readBody(req) {
  return new Promise((resolve) => {
    let d = '';
    req.on('data', (c) => (d += c));
    req.on('end', () => resolve(d));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  if (p === '/login' && req.method === 'GET') return servePage(res, 'login.html');

  if (p === '/login' && req.method === 'POST') {
    const body = await readBody(req);
    const pass = new URLSearchParams(body).get('password');
    if (checkPassword(pass)) {
      newSession(res);
      res.writeHead(302, { Location: '/' });
      return res.end();
    }
    res.writeHead(302, { Location: '/login?e=1' });
    return res.end();
  }

  if (p === '/logout') {
    const c = (req.headers.cookie || '').match(/sid=([a-f0-9]+)/);
    if (c) sessions.delete(c[1]);
    res.writeHead(302, { Location: '/login', 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });
    return res.end();
  }

  // --- a partir de aquí, todo requiere sesión ---
  if (!isAuthed(req)) {
    if (p.startsWith('/api/')) return send(res, 401, '{"error":"no autorizado"}', 'application/json');
    res.writeHead(302, { Location: '/login' });
    return res.end();
  }

  if (p === '/' && req.method === 'GET') return servePage(res, 'form.html');
  if (p === '/registros' && req.method === 'GET') return servePage(res, 'registros.html');

  if (p === '/api/registros' && req.method === 'GET') {
    const rows = db.prepare('SELECT * FROM citizens ORDER BY id DESC').all();
    return send(res, 200, JSON.stringify(rows), 'application/json');
  }

  if (p === '/api/registros' && req.method === 'POST') {
    const data = JSON.parse((await readBody(req)) || '{}');
    const vals = FIELDS.map((k) => (data[k] === undefined || data[k] === '' ? null : data[k]));
    const ip = req.socket.remoteAddress || '';
    insertStmt.run(...vals, new Date().toISOString(), ip, req.headers['user-agent'] || '');
    return send(res, 200, '{"ok":true}', 'application/json');
  }

  send(res, 404, 'No encontrado');
});

server.listen(PORT, () => console.log(`Censo / Registro en http://localhost:${PORT}  (contraseña: ${PASSWORD})`));
