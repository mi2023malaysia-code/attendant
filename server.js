const http = require('http');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { URL } = require('url');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = process.env.VERCEL ? path.join(os.tmpdir(), 'participant-intake') : path.join(ROOT, 'data');
const PESERTA_CSV_FILE = process.env.VERCEL ? path.join(DATA_DIR, 'peserta.csv') : path.join(ROOT, 'peserta.csv');
const STORAGE_FILE = path.join(DATA_DIR, 'submissions.jsonl');
const RUNTIME_FILE = path.join(DATA_DIR, 'runtime.json');
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = String(process.env.SUPABASE_ANON_KEY || '');
const PARTICIPANT_TOKEN = String(process.env.PARTICIPANT_TOKEN || '');
const HAS_SUPABASE = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && PARTICIPANT_TOKEN);
const SUPABASE_RPC = {
  listCategories: 'list_116_categories',
  listWebinars: 'list_116_webinars',
  listParticipants: 'list_116_participants',
  submitParticipant: 'submit_116_participant',
};
const PORT_START = Number(process.env.PORT || 3000);
const PORT_END = PORT_START + 25;

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

  const sourceCsvPath = path.join(ROOT, 'peserta.csv');

  const copySourceCsvIfNeeded = async () => {
    if (!process.env.VERCEL) {
      return false;
    }

    const sourceCsv = await fs.readFile(sourceCsvPath, 'utf8').catch(() => '');
    const sourceRows = String(sourceCsv || '')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (sourceRows.length <= 1) {
      return false;
    }

    await fs.writeFile(PESERTA_CSV_FILE, sourceCsv, 'utf8');
    return true;
  };

  try {
    const existingText = await fs.readFile(PESERTA_CSV_FILE, 'utf8');
    const existingRows = String(existingText || '')
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (existingRows.length <= 1 && await copySourceCsvIfNeeded()) {
      return;
    }

    if (existingRows.length === 0) {
      await fs.writeFile(PESERTA_CSV_FILE, `${PESERTA_CSV_HEADER}\n`, 'utf8');
    }
  } catch {
    if (await copySourceCsvIfNeeded()) {
      return;
    }

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

async function loadWebinarOptions() {
  if (!HAS_SUPABASE) {
    const records = await readAllLocalRecords();
    const seen = new Set();
    return records
      .map((record) => ({
        value: safeRecordValue(record.webinarTitle),
        label: safeRecordValue(record.webinarTitle),
      }))
      .filter((item) => {
        if (!item.value || seen.has(item.value)) {
          return false;
        }

        seen.add(item.value);
        return true;
      });
  }

  const payload = await supabaseRpc(SUPABASE_RPC.listWebinars, {});
  const rows = Array.isArray(payload) ? payload : [];

  return rows
    .map((row) => ({
      value: safeRecordValue(row.value),
      label: safeRecordValue(row.label || row.value),
    }))
    .filter((item) => item.value);
}

async function loadCategoryOptions() {
  if (!HAS_SUPABASE) {
    const records = await readAllLocalRecords();
    const seen = new Set();
    return records
      .map((record) => ({
        value: safeRecordValue(record.category),
        label: safeRecordValue(record.category),
      }))
      .filter((item) => {
        if (!item.value || seen.has(item.value)) {
          return false;
        }

        seen.add(item.value);
        return true;
      });
  }

  const payload = await supabaseRpc(SUPABASE_RPC.listCategories, {});
  const rows = Array.isArray(payload) ? payload : [];

  return rows
    .map((row) => ({
      value: safeRecordValue(row.value),
      label: safeRecordValue(row.label || row.value),
    }))
    .filter((item) => item.value);
}

function renderWebinarOptions(items) {
  const list = items.length > 0
    ? items
    : [{ value: '', label: 'Tiada tajuk webinar dalam Supabase.' }];

  return list
    .map((item, index) => {
      const value = escapeHtml(item.value);
      const label = escapeHtml(item.label || item.value);
      const selected = index === 0 ? ' selected' : '';
      const disabled = item.value ? '' : ' disabled';
      return `                <option value="${value}"${selected}${disabled}>${label}</option>`;
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

function normalizeWebinarTitle(rawValue, allowedTitles) {
  const value = String(rawValue || '').trim();

  if (!allowedTitles || !allowedTitles.has(value)) {
    throw new Error('Webinar tajuk tidak sah atau tidak tersenarai dalam sumber webinar.');
  }

  return value;
}

function normalizeCategory(rawValue, allowedCategories) {
  const value = String(rawValue || '').trim();

  if (!allowedCategories || !allowedCategories.has(value)) {
    throw new Error('Category tidak sah atau tidak tersenarai dalam sumber category.');
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

async function readAllLocalRecords() {
  await ensureDataFilesReady();
  const text = await fs.readFile(PESERTA_CSV_FILE, 'utf8');
  return parseParticipantCsvRows(text);
}

async function writeLocalRecords(records) {
  await ensureDataFilesReady();

  const csvRows = [
    PESERTA_CSV_HEADER,
    ...records.map((record) => serializePesertaCsvRow(record)),
  ];
  await fs.writeFile(PESERTA_CSV_FILE, `${csvRows.join('\n')}\n`, 'utf8');

  const jsonLines = records.map((record) => JSON.stringify(record));
  await fs.writeFile(STORAGE_FILE, jsonLines.length > 0 ? `${jsonLines.join('\n')}\n` : '', 'utf8');
}

async function deleteLocalRecordsByIds(ids) {
  const uniqueIds = [...new Set(ids.map(safeRecordValue).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return {
      deletedCount: 0,
      deletedIds: [],
    };
  }

  const items = await readAllLocalRecords();
  const idSet = new Set(uniqueIds);
  const remainingItems = [];
  const deletedIds = [];

  for (const item of items) {
    const id = safeRecordValue(item.id);
    if (idSet.has(id)) {
      deletedIds.push(id);
      continue;
    }

    remainingItems.push(item);
  }

  if (deletedIds.length === 0) {
    return {
      deletedCount: 0,
      deletedIds: [],
    };
  }

  await writeLocalRecords(remainingItems);

  return {
    deletedCount: deletedIds.length,
    deletedIds,
  };
}

async function readLocalRecords(limit = 50) {
  const items = await readAllLocalRecords();
  const total = items.length;

  return {
    items: items.slice(Math.max(0, total - limit)),
    total,
  };
}

function safeRecordValue(value) {
  return String(value ?? '').trim();
}

function toSupabasePayload(record) {
  return {
    id: safeRecordValue(record.id),
    created_at: safeRecordValue(record.createdAt),
    source: safeRecordValue(record.source),
    webinar_title: safeRecordValue(record.webinarTitle),
    full_name: safeRecordValue(record.fullName),
    country: safeRecordValue(record.country),
    identity_type: safeRecordValue(record.identityType),
    identity_number: safeRecordValue(record.identityNumber),
    passport_country: safeRecordValue(record.passportCountry),
    email: safeRecordValue(record.email),
    whatsapp_number: safeRecordValue(record.whatsappNumber),
    whatsapp_format: safeRecordValue(record.whatsappFormat),
    category: safeRecordValue(record.category),
    consent: safeRecordValue(record.consent),
    notes: safeRecordValue(record.notes),
  };
}

function fromSupabaseRow(row) {
  return {
    id: safeRecordValue(row.id),
    createdAt: safeRecordValue(row.created_at),
    source: safeRecordValue(row.source),
    webinarTitle: safeRecordValue(row.webinar_title),
    fullName: safeRecordValue(row.full_name),
    country: safeRecordValue(row.country),
    identityType: safeRecordValue(row.identity_type),
    identityNumber: safeRecordValue(row.identity_number),
    passportCountry: safeRecordValue(row.passport_country),
    email: safeRecordValue(row.email),
    whatsappNumber: safeRecordValue(row.whatsapp_number),
    whatsappFormat: safeRecordValue(row.whatsapp_format),
    category: safeRecordValue(row.category),
    consent: safeRecordValue(row.consent),
    notes: safeRecordValue(row.notes),
  };
}

function createSupabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'x-participant-token': PARTICIPANT_TOKEN,
  };
}

async function supabaseRpc(functionName, body) {
  if (!HAS_SUPABASE) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
    method: 'POST',
    headers: createSupabaseHeaders(),
    body: JSON.stringify(body || {}),
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && payload.message
      ? payload.message
      : (typeof payload === 'string' && payload ? payload : `Supabase RPC ${functionName} gagal.`);
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function loadParticipantsFromSupabase(limit = 1000) {
  const payload = await supabaseRpc(SUPABASE_RPC.listParticipants, { limit_count: limit });
  const rows = Array.isArray(payload) ? payload : [];
  const items = rows.map(fromSupabaseRow);
  const total = rows.length > 0 ? Number(rows[0].total_count || rows.length) : 0;

  return {
    items,
    total: Number.isFinite(total) ? total : items.length,
  };
}

async function saveParticipantToSupabase(record) {
  const payload = await supabaseRpc(SUPABASE_RPC.submitParticipant, { payload: toSupabasePayload(record) });
  const rows = Array.isArray(payload) ? payload : [payload];
  const row = rows.find(Boolean);

  if (!row) {
    throw new Error('Simpanan Supabase gagal.');
  }

  return fromSupabaseRow(row);
}

async function deleteSupabaseParticipantsByIds(ids) {
  const uniqueIds = [...new Set(ids.map(safeRecordValue).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return {
      deletedCount: 0,
      deletedIds: [],
    };
  }

  const rpcCandidates = [
    'delete_116_participant',
    'delete_116_participants',
    'remove_116_participant',
    'remove_116_participants',
  ];

  for (const functionName of rpcCandidates) {
    try {
      const payload = await supabaseRpc(functionName, { ids: uniqueIds });
      const rows = Array.isArray(payload) ? payload : (payload ? [payload] : []);
      const deletedIds = rows
        .map((row) => safeRecordValue(row.id || row.deleted_id || row.record_id))
        .filter(Boolean);

      return {
        deletedCount: deletedIds.length || uniqueIds.length,
        deletedIds: deletedIds.length > 0 ? deletedIds : uniqueIds,
        storage: 'supabase-rpc',
        strategy: functionName,
      };
    } catch (error) {
      // Try the next candidate or fall back to direct REST.
    }
  }

  const query = new URLSearchParams({
    id: `in.(${uniqueIds.join(',')})`,
  });

  const response = await fetch(`${SUPABASE_URL}/rest/v1/116_participants?${query.toString()}`, {
    method: 'DELETE',
    headers: {
      ...createSupabaseHeaders(),
      Accept: 'application/json',
      'Accept-Profile': 'private',
      'Content-Profile': 'private',
      Prefer: 'return=representation',
    },
  });

  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    const message = payload && typeof payload === 'object' && payload.message
      ? payload.message
      : (typeof payload === 'string' && payload ? payload : 'Padam Supabase gagal.');
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const rows = Array.isArray(payload) ? payload : (payload ? [payload] : []);
  const deletedIds = rows
    .map((row) => safeRecordValue(row.id))
    .filter(Boolean);

  return {
    deletedCount: deletedIds.length || uniqueIds.length,
    deletedIds: deletedIds.length > 0 ? deletedIds : uniqueIds,
    storage: 'supabase-rest',
  };
}

async function deleteParticipantsByIds(ids) {
  const uniqueIds = [...new Set(ids.map(safeRecordValue).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return {
      deletedCount: 0,
      deletedIds: [],
      storage: HAS_SUPABASE ? 'supabase' : 'local',
    };
  }

  if (HAS_SUPABASE) {
    const result = await deleteSupabaseParticipantsByIds(uniqueIds);
    await deleteLocalRecordsByIds(uniqueIds).catch(() => null);
    return {
      ...result,
      storage: 'supabase',
    };
  }

  const result = await deleteLocalRecordsByIds(uniqueIds);
  return {
    ...result,
    storage: 'local',
  };
}

function parseParticipantCsvRows(csvText) {
  const rows = String(csvText || '')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rows.length <= 1) {
    return [];
  }

  const headers = parseCsvLine(rows[0]).map((cell) => String(cell || '').trim());

  return rows.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const record = {};

    headers.forEach((header, index) => {
      record[header] = String(cells[index] || '').trim();
    });

    return record;
  }).filter((record) => safeRecordValue(record.id));
}

let supabaseBootstrapPromise = null;

async function ensureSupabaseBootstrap() {
  if (!HAS_SUPABASE) {
    return { enabled: false, imported: false };
  }

  if (!supabaseBootstrapPromise) {
    supabaseBootstrapPromise = (async () => {
      const existing = await loadParticipantsFromSupabase(1).catch((error) => {
        throw new Error(`Supabase belum sedia: ${error.message || 'gagal baca rekod.'}`);
      });

      if (existing.items.length > 0) {
        return { enabled: true, imported: false, total: existing.total };
      }

      const csvText = await fs.readFile(PESERTA_CSV_FILE, 'utf8').catch((error) => {
        if (error.code === 'ENOENT') {
          return '';
        }
        throw error;
      });
      const localRows = parseParticipantCsvRows(csvText);

      for (const row of localRows) {
        await saveParticipantToSupabase({
          ...row,
          createdAt: row.createdAt || new Date().toISOString(),
        });
      }

      return { enabled: true, imported: localRows.length > 0, total: localRows.length };
    })().catch((error) => {
      supabaseBootstrapPromise = null;
      throw error;
    });
  }

  return supabaseBootstrapPromise;
}

function buildRecord(body, allowedTitles, allowedCategories) {
  const country = normalizeCountry(body.country);
  const source = normalizeSource(body.source);
  const webinarTitle = normalizeWebinarTitle(body.webinarTitle, allowedTitles);
  const fullName = normalizeName(body.fullName);
  const email = normalizeEmail(body.email);
  const category = normalizeCategory(body.category, allowedCategories);
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
      sendText(res, 500, 'Gagal memuat halaman');
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
    return sendJson(res, 200, {
      ok: true,
      source: HAS_SUPABASE ? 'supabase' : 'local-file',
      items,
    });
  }

  if (req.method === 'GET' && pathname === '/api/categories') {
    const items = await loadCategoryOptions();
    return sendJson(res, 200, {
      ok: true,
      source: HAS_SUPABASE ? 'supabase' : 'local-file',
      items,
    });
  }

  if (req.method === 'GET' && pathname === '/api/submissions') {
    const requestedLimit = Number(requestUrl.searchParams.get('limit') || 100);
    const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(Math.floor(requestedLimit), 1000)
      : 100;

    if (HAS_SUPABASE) {
      await ensureSupabaseBootstrap();
      const { items, total } = await loadParticipantsFromSupabase(limit);
      return sendJson(res, 200, {
        ok: true,
        count: Number.isFinite(Number(total)) ? Number(total) : items.length,
        returnedCount: items.length,
        source: 'supabase',
        items,
      });
    }

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
      const [webinarOptions, categoryOptions] = await Promise.all([
        loadWebinarOptions(),
        loadCategoryOptions(),
      ]);
      const allowedTitles = new Set(webinarOptions.map((item) => item.value));
      const allowedCategories = new Set(categoryOptions.map((item) => item.value));
      const record = buildRecord(body, allowedTitles, allowedCategories);

      if (HAS_SUPABASE) {
        await ensureSupabaseBootstrap();
        const savedRecord = await saveParticipantToSupabase(record);
        await appendPesertaCsv(savedRecord);

        return sendJson(res, 200, {
          ok: true,
          record: savedRecord,
          storage: 'supabase',
        });
      }

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

  if (req.method === 'POST' && pathname === '/api/delete') {
    try {
      const body = await readJsonBody(req);
      const ids = Array.isArray(body.ids)
        ? body.ids
        : (Array.isArray(body.recordIds) ? body.recordIds : (body.id ? [body.id] : []));
      const normalizedIds = [...new Set(ids.map(safeRecordValue).filter(Boolean))];

      if (normalizedIds.length === 0) {
        throw new Error('Tiada rekod sah untuk dipadam.');
      }

      const result = await deleteParticipantsByIds(normalizedIds);
      const deletedCount = Number.isFinite(Number(result.deletedCount))
        ? Number(result.deletedCount)
        : normalizedIds.length;
      const deletedIds = Array.isArray(result.deletedIds) && result.deletedIds.length > 0
        ? result.deletedIds
        : (deletedCount > 0 ? normalizedIds : []);

      return sendJson(res, 200, {
        ok: true,
        deletedCount,
        deletedIds,
        storage: result.storage || (HAS_SUPABASE ? 'supabase' : 'local'),
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
