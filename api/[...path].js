const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { URL } = require('url');

const ROOT = process.cwd();
const WEBINAR_TXT_FILE = path.join(ROOT, 'webinar.txt');
const DATA_DIR = path.join(os.tmpdir(), 'attendant-data');
const STORAGE_FILE = path.join(DATA_DIR, 'submissions.jsonl');
const PESERTA_CSV_FILE = path.join(DATA_DIR, 'peserta.csv');
const GOOGLE_APPS_SCRIPT_URL = (process.env.GOOGLE_APPS_SCRIPT_URL || '').trim();
const GOOGLE_WEBINAR_SHEET_NAME = (process.env.GOOGLE_WEBINAR_SHEET_NAME || 'webinar').trim() || 'webinar';

const DEFAULT_WEBINARS = [
  { value: '201-codex     12 Jul 3pm', label: '201-codex     12 Jul 3pm' },
  { value: '202-claude    13 Jul 5', label: '202-claude    13 Jul 5' },
  { value: '303-chagrpt   21 Jul 5pm', label: '303-chagrpt   21 Jul 5pm' },
];

const CSV_FIELDS = [
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

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function escapeCsvValue(value) {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function serializePesertaCsvRow(record) {
  return CSV_FIELDS.map((field) => escapeCsvValue(record[field] ?? '')).join(',');
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

function normalizeWebinarItem(item) {
  if (!item) {
    return null;
  }

  if (typeof item === 'string') {
    const value = item.trim();
    if (!value) {
      return null;
    }

    return { value, label: value };
  }

  if (Array.isArray(item)) {
    const value = String(item[0] || '').trim();
    if (!value) {
      return null;
    }

    const label = String(item[1] || value).trim() || value;
    return { value, label };
  }

  if (typeof item === 'object') {
    const value = String(item.value ?? item.title ?? item.code ?? item.slug ?? item.id ?? '').trim();
    if (!value) {
      return null;
    }

    const label = String(item.label ?? item.name ?? item.display ?? value).trim() || value;
    return { value, label };
  }

  return null;
}

async function loadWebinarOptionsFromGoogleSheet() {
  if (!GOOGLE_APPS_SCRIPT_URL) {
    return [];
  }

  const endpoint = new URL(GOOGLE_APPS_SCRIPT_URL);
  endpoint.searchParams.set('action', 'webinars');
  endpoint.searchParams.set('sheet', GOOGLE_WEBINAR_SHEET_NAME);

  const response = await fetch(endpoint);
  const text = await response.text();

  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('Respon Google Sheets tidak sah.');
  }

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.error || `Google Sheets fetch failed with status ${response.status}.`);
  }

  const rawItems = Array.isArray(payload.items)
    ? payload.items
    : Array.isArray(payload.webinars)
      ? payload.webinars
      : Array.isArray(payload.data)
        ? payload.data
        : [];

  return rawItems.map(normalizeWebinarItem).filter(Boolean);
}

async function loadWebinarOptions() {
  if (GOOGLE_APPS_SCRIPT_URL) {
    try {
      const remoteItems = await loadWebinarOptionsFromGoogleSheet();
      if (remoteItems.length > 0) {
        return remoteItems;
      }
    } catch {
      // Fall back to the local text file when the sheet is unavailable.
    }
  }

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
      await fs.writeFile(PESERTA_CSV_FILE, `${CSV_FIELDS.join(',')}\n`, 'utf8');
    }
  } catch {
    await fs.writeFile(PESERTA_CSV_FILE, `${CSV_FIELDS.join(',')}\n`, 'utf8');
  }
}

async function appendLocalRecord(record) {
  const line = `${JSON.stringify(record)}\n`;
  await fs.appendFile(STORAGE_FILE, line, 'utf8');
}

async function appendPesertaCsv(record) {
  const line = `${serializePesertaCsvRow(record)}\n`;
  await fs.appendFile(PESERTA_CSV_FILE, line, 'utf8');
}

async function readLocalRecords(limit = 50) {
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

  return rows.slice(Math.max(0, rows.length - limit));
}

async function forwardToGoogleSheet(record) {
  if (!GOOGLE_APPS_SCRIPT_URL) {
    return { ok: false, skipped: true };
  }

  const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(record),
  });

  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    throw new Error(payload?.error || `Google Sheets sync failed with status ${response.status}.`);
  }

  return payload || { ok: true };
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

async function handler(req, res) {
  await ensureDataFiles();

  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const pathname = requestUrl.pathname;

  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === 'GET' && pathname === '/api/webinars') {
    const items = await loadWebinarOptions();
    return sendJson(res, 200, { ok: true, items });
  }

  if (req.method === 'GET' && pathname === '/api/submissions') {
    const items = await readLocalRecords(100);
    return sendJson(res, 200, { ok: true, count: items.length, items });
  }

  if (req.method === 'POST' && pathname === '/api/save') {
    try {
      const body = await readJsonBody(req);
      const webinarOptions = await loadWebinarOptions();
      const allowedTitles = new Set(webinarOptions.map((item) => item.value));
      const record = buildRecord(body, allowedTitles);
      await appendLocalRecord(record);
      await appendPesertaCsv(record);

      let sheetSync = { ok: false, skipped: true };
      if (GOOGLE_APPS_SCRIPT_URL) {
        try {
          sheetSync = await forwardToGoogleSheet(record);
        } catch (syncError) {
          sheetSync = {
            ok: false,
            error: syncError.message,
          };
        }
      }

      return sendJson(res, 200, {
        ok: true,
        record,
        storage: 'local',
        googleSheet: sheetSync,
      });
    } catch (error) {
      return sendJson(res, 400, {
        ok: false,
        error: error.message || 'Request tidak sah.',
      });
    }
  }

  return sendJson(res, 404, { ok: false, error: 'Not found' });
}

module.exports = handler;
