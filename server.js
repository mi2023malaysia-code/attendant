const http = require('http');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'participant-intake') : path.join(ROOT, 'data');
const WEBINAR_TXT_FILE = path.join(ROOT, 'webinar.txt');
const PESERTA_CSV_FILE = process.env.VERCEL ? path.join(DATA_DIR, 'peserta.csv') : path.join(ROOT, 'peserta.csv');
const STORAGE_FILE = path.join(DATA_DIR, 'submissions.jsonl');
const RUNTIME_FILE = path.join(DATA_DIR, 'runtime.json');
const PORT_START = Number(process.env.PORT || 3000);
const PORT_END = PORT_START + 25;
const ADMIN_TOKEN = '12346';
const DEFAULT_WEBINARS = [
  { value: '201-codex     12 Jul 3pm', label: '201-codex     12 Jul 3pm' },
  { value: '202-claude    13 Jul 5', label: '202-claude    13 Jul 5' },
  { value: '303-chagrpt   21 Jul 5pm', label: '303-chagrpt   21 Jul 5pm' },
];

let dataFilesReadyPromise = null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const PESERTA_CSV_FIELDS = [
  'id',
  'createdAt',
  'source',
  'webinarTitle',
  'fullName',
  'country',
  'identityType',
  'identityNumber',
  'passportCountry',
  'email',
  'whatsappNumber',
  'whatsappFormat',
  'category',
  'consent',
  'notes',
];

const PESERTA_CSV_HEADER = PESERTA_CSV_FIELDS.join(',');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function serializePesertaCsvRow(record) {
  return PESERTA_CSV_FIELDS.map((field) => escapeCsvValue(record[field] ?? '')).join(',');
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORAGE_FILE);
  } catch {
    await fs.writeFile(STORAGE_FILE, '', 'utf8');
  }

  try {
    const stats = await fs.stat(PESERTA_CSV_FILE);
    if (stats.size === 0) {
      await fs.writeFile(PESERTA_CSV_FILE, `${PESERTA_CSV_HEADER}\n`, 'utf8');
    }
  } catch {
    await fs.writeFile(PESERTA_CSV_FILE, `${PESERTA_CSV_HEADER}\n`, 'utf8');
  }
}

async function ensureDataFilesReady() {
  if (!dataFilesReadyPromise) {
    dataFilesReadyPromise = ensureDataFiles().catch((error) => {
      dataFilesReadyPromise = null;
      throw error;
    });
  }

  return dataFilesReadyPromise;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function sendText(res, statusCode, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === ',') {
      cells.push(cell);
      cell = '';
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    cell += char;
  }

  cells.push(cell);
  return cells;
}

function parseWebinarRows(csvText) {
  const rows = String(csvText || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
    .map((cells) => cells.map((cell) => String(cell || '').trim()));

  if (rows.length === 0) {
    return [];
  }

  const headerTokens = new Set(['value', 'label', 'title', 'webinartitle', 'code', 'slug', 'id', 'name', 'display']);
  const firstRow = rows[0].map((cell) => cell.toLowerCase());
  const hasHeader = firstRow.some((cell) => headerTokens.has(cell));
  const dataRows = hasHeader ? rows.slice(1) : rows;

  if (dataRows.length === 0) {
    return [];
  }

  if (!hasHeader) {
    return dataRows
      .map((row) => {
        const value = String(row[0] || '').trim();
        if (!value) {
          return null;
        }
        const label = String(row[1] || value).trim() || value;
        return { value, label };
      })
      .filter(Boolean);
  }

  const header = rows[0].map((cell) => cell.toLowerCase());
  const valueIndex = header.findIndex((cell) => cell === 'value' || cell === 'title' || cell === 'webinartitle' || cell === 'code' || cell === 'slug' || cell === 'id');
  const labelIndex = header.findIndex((cell) => cell === 'label' || cell === 'name' || cell === 'display');

  return dataRows
    .map((row) => {
      const value = String(row[valueIndex >= 0 ? valueIndex : 0] || '').trim();
      if (!value) {
        return null;
      }

      const labelSource = labelIndex >= 0 ? row[labelIndex] : row[valueIndex >= 0 ? valueIndex : 0];
      const label = String(labelSource || value).trim() || value;

      return { value, label };
    })
    .filter(Boolean);
}

async function loadWebinarOptions() {
  try {
    const txtText = await fs.readFile(WEBINAR_TXT_FILE, 'utf8');
    const items = parseWebinarRows(txtText);
    return items.length > 0 ? items : DEFAULT_WEBINARS;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return DEFAULT_WEBINARS;
    }

    throw new Error(`Gagal baca webinar.txt: ${error.message}`);
  }
}

function getAdminTokenFromRequest(req) {
  const headerToken = String(req.headers['x-admin-token'] || '').trim();
  if (headerToken) {
    return headerToken;
  }

  const authHeader = String(req.headers.authorization || '').trim();
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch) {
    return bearerMatch[1].trim();
  }

  return '';
}

function authorizeAdmin(req) {
  if (!ADMIN_TOKEN) {
    return {
      status: 503,
      error: 'ADMIN_TOKEN belum dikonfigurasi pada persekitaran produksi.',
    };
  }

  const token = getAdminTokenFromRequest(req);
  if (!token || token !== ADMIN_TOKEN) {
    return {
      status: 401,
      error: 'Token admin tidak sah.',
    };
  }

  return null;
}

function renderWebinarOptions(items) {
  const list = items.length > 0 ? items : DEFAULT_WEBINARS;

  return list
    .map((item, index) => {
      const value = escapeHtml(item.value);
      const label = escapeHtml(item.label || item.value);
      const selected = index === 0 ? ' selected' : '';
      return `                <option value="${value}"${selected}>${label}</option>`;
    })
    .join('\n');
}

async function renderIndexHtml() {
  const template = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8');
  const webinars = await loadWebinarOptions();
  return template.replace('<!--WEBINAR_OPTIONS-->', renderWebinarOptions(webinars));
}

function normalizeMalaysiaWhatsApp(rawValue) {
  const digits = String(rawValue || '').replace(/\D/g, '');
  let normalized = digits;

  if (normalized.startsWith('60')) {
    normalized = normalized.slice(2);
  }

  if (normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }

  if (normalized.length < 9 || normalized.length > 10) {
    throw new Error('WhatsApp Malaysia mesti ada 9 hingga 10 digit selepas kod negara.');
  }

  return `+60${normalized}`;
}

function normalizeInternationalWhatsApp(rawValue) {
  const cleaned = String(rawValue || '').trim().replace(/[\s-]/g, '');

  if (!/^\+[1-9]\d{7,14}$/.test(cleaned)) {
    throw new Error('WhatsApp negara lain mesti ikut format E.164, contohnya +447700900123.');
  }

  return cleaned;
}

function normalizeNric(rawValue) {
  const digits = String(rawValue || '').replace(/\D/g, '');

  if (digits.length !== 12) {
    throw new Error('NRIC Malaysia mesti ada 12 digit.');
  }

  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

function normalizePassport(rawValue) {
  const value = String(rawValue || '').trim().toUpperCase();

  if (value.length < 5) {
    throw new Error('Nombor passport terlalu pendek.');
  }

  if (!/^[A-Z0-9\-\/]+$/.test(value)) {
    throw new Error('Nombor passport hanya boleh mengandungi huruf, nombor, tanda - dan /.');
  }

  return value;
}

function normalizeEmail(rawValue) {
  const value = String(rawValue || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error('Email tidak sah.');
  }
  return value;
}

function normalizeName(rawValue) {
  const value = String(rawValue || '').trim().replace(/\s+/g, ' ');
  if (!value) {
    throw new Error('Nama diperlukan.');
  }
  return value;
}

function normalizeSource(rawValue) {
  const value = String(rawValue || '').trim();
  const allowed = new Set(['Codex', 'Claude', 'Gemini']);

  if (!allowed.has(value)) {
    throw new Error('Source mesti Codex, Claude, atau Gemini.');
  }

  return value;
}

function normalizeWebinarTitle(rawValue, allowedTitles = new Set(DEFAULT_WEBINARS.map((item) => item.value))) {
  const value = String(rawValue || '').trim();

  if (!allowedTitles.has(value)) {
    throw new Error('Webinar tajuk tidak sah atau tidak tersenarai dalam webinar.txt.');
  }

  return value;
}

function normalizeCategory(rawValue) {
  const value = String(rawValue || '').trim();
  const allowed = new Set(['Pelajar', 'Bekerja', 'Bersara']);

  if (!allowed.has(value)) {
    throw new Error('Category mesti Pelajar, Bekerja, atau Bersara.');
  }

  return value;
}

function normalizeCountry(rawValue) {
  const value = String(rawValue || '').trim();
  const allowed = new Set(['Malaysia', 'Other']);

  if (!allowed.has(value)) {
    throw new Error('Country mesti Malaysia atau Other.');
  }

  return value;
}

function normalizeBoolean(rawValue) {
  return rawValue === true || rawValue === 'true' || rawValue === 'on' || rawValue === 1 || rawValue === '1';
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > 1_000_000) {
      throw new Error('Body terlalu besar.');
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const text = Buffer.concat(chunks).toString('utf8');
  return JSON.parse(text);
}

async function appendLocalRecord(record) {
  await ensureDataFilesReady();
  const line = `${JSON.stringify(record)}\n`;
  await fs.appendFile(STORAGE_FILE, line, 'utf8');
}

async function appendPesertaCsv(record) {
  await ensureDataFilesReady();
  const line = `${serializePesertaCsvRow(record)}\n`;
  await fs.appendFile(PESERTA_CSV_FILE, line, 'utf8');
}

async function readLocalRecords(limit = 50) {
  await ensureDataFilesReady();
  const text = await fs.readFile(STORAGE_FILE, 'utf8');
  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const total = rows.length;
  return {
    items: rows.slice(Math.max(0, total - limit)),
    total,
  };
}

function buildRecord(body, allowedTitles) {
  const country = normalizeCountry(body.country);
  const source = normalizeSource(body.source);
  const webinarTitle = normalizeWebinarTitle(body.webinarTitle, allowedTitles);
  const fullName = normalizeName(body.fullName);
  const email = normalizeEmail(body.email);
  const category = normalizeCategory(body.category);
  const consent = '';
  const notes = String(body.notes || '').trim();

  let identityType = '';
  let identityNumber = '';
  let passportCountry = '';
  let whatsappNumber = '';
  let whatsappFormat = '';

  if (country === 'Malaysia') {
    identityType = 'NRIC';
    identityNumber = normalizeNric(body.identityNumber);
    whatsappNumber = normalizeMalaysiaWhatsApp(body.whatsappNumber);
    whatsappFormat = 'Malaysia';
  } else {
    identityType = 'Passport';
    identityNumber = normalizePassport(body.identityNumber);
    passportCountry = String(body.passportCountry || '').trim();

    if (!passportCountry) {
      throw new Error('Negara pasport diperlukan untuk peserta luar Malaysia.');
    }

    whatsappNumber = normalizeInternationalWhatsApp(body.whatsappNumber);
    whatsappFormat = 'International';
  }

  return {
    id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    source,
    webinarTitle,
    fullName,
    country,
    identityType,
    identityNumber,
    passportCountry,
    email,
    whatsappNumber,
    whatsappFormat,
    category,
    consent,
    notes,
  };
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (ext === '.html' && path.basename(filePath) === 'index.html') {
    renderIndexHtml()
      .then((content) => {
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store',
        });
        res.end(content);
      })
      .catch(() => {
        sendText(res, 404, 'Not found');
      });
    return;
  }

  fs.readFile(filePath)
    .then((content) => {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store',
      });
      res.end(content);
    })
    .catch(() => {
      sendText(res, 404, 'Not found');
    });
}

function resolvePublicFile(urlPath) {
  const safePath = urlPath === '/' ? '/index.html' : urlPath;
  const normalized = path.normalize(safePath).replace(/^(\.\.[\\/])+/, '');
  const absolute = path.join(PUBLIC_DIR, normalized);

  if (!absolute.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return absolute;
}

async function handler(req, res) {
  await ensureDataFilesReady();

  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = requestUrl.pathname;

  if (req.method === 'GET' && (pathname === '/admin' || pathname === '/admin/')) {
    return serveFile(res, path.join(PUBLIC_DIR, 'admin.html'));
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'GET' && pathname === '/api/webinars') {
    const items = await loadWebinarOptions();
    return sendJson(res, 200, { ok: true, items });
  }

  if (req.method === 'GET' && pathname === '/api/submissions') {
    const authError = authorizeAdmin(req);
    if (authError) {
      return sendJson(res, authError.status, { ok: false, error: authError.error });
    }

    const requestedLimit = Number(requestUrl.searchParams.get('limit') || 100);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 1000)
      : 100;

    const { items, total } = await readLocalRecords(limit);
    return sendJson(res, 200, {
      ok: true,
      count: Number.isFinite(Number(total)) ? Number(total) : items.length,
      returnedCount: items.length,
      source: 'local-file',
      items,
    });
  }

  if (req.method === 'POST' && pathname === '/api/save') {
    try {
      const body = await readJsonBody(req);
      const webinarOptions = await loadWebinarOptions();
      const allowedTitles = new Set(webinarOptions.map((item) => item.value));
      const record = buildRecord(body, allowedTitles);
      await appendLocalRecord(record);
      await appendPesertaCsv(record);

      return sendJson(res, 200, {
        ok: true,
        record,
        storage: 'local',
      });
    } catch (error) {
      return sendJson(res, 400, {
        ok: false,
        error: error.message || 'Request tidak sah.',
      });
    }
  }

  if (req.method === 'GET') {
    const filePath = resolvePublicFile(pathname);
    if (filePath) {
      return serveFile(res, filePath);
    }
  }

  sendText(res, 404, 'Not found');
}

async function writeRuntimeFile(port) {
  const runtime = {
    port,
    url: `http://127.0.0.1:${port}`,
    startedAt: new Date().toISOString(),
    storage: 'local',
  };

  await fs.writeFile(RUNTIME_FILE, `${JSON.stringify(runtime, null, 2)}\n`, 'utf8');
}

async function startServer() {
  await ensureDataFilesReady();

  const server = http.createServer((req, res) => {
    handler(req, res).catch((error) => {
      sendJson(res, 500, { ok: false, error: error.message || 'Server error' });
    });
  });

  let lastError = null;

  for (let port = PORT_START; port <= PORT_END; port += 1) {
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', () => {
          server.removeAllListeners('error');
          resolve();
        });
      });

      await writeRuntimeFile(port);
      console.log(`Participant intake app running at http://127.0.0.1:${port}`);
      return;
    } catch (error) {
      lastError = error;
      if (server.listening) {
        await new Promise((resolve) => server.close(resolve));
      }
    }
  }

  throw lastError || new Error('Unable to start server.');
}

module.exports = handler;
module.exports.startServer = startServer;

if (require.main === module) {
  startServer().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
