const adminMessage = document.getElementById('adminMessage');
const addParticipantButton = document.getElementById('addParticipantButton');
const loadButton = document.getElementById('loadButton');
const refreshButton = document.getElementById('refreshButton');
const searchInput = document.getElementById('searchInput');
const exportButton = document.getElementById('exportButton');
const submissionsBody = document.getElementById('submissionsBody');
const emptyState = document.getElementById('emptyState');
const tableWrap = document.getElementById('tableWrap');
const sourceHint = document.getElementById('sourceHint');
const totalCount = document.getElementById('totalCount');
const latestCount = document.getElementById('latestCount');
const sourceLabel = document.getElementById('sourceLabel');
const countrySplit = document.getElementById('countrySplit');

let allItems = [];
let activeSource = 'local-file';
let hasLoadedData = false;
let totalRecords = 0;

function safeText(value) {
  return String(value ?? '').trim();
}

function escapeCsvValue(value) {
  const text = safeText(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('ms-MY', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function normalizeRecord(item) {
  const record = {};
  Object.entries(item || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      record[key] = '';
      return;
    }
    record[key] = typeof value === 'string' ? value.trim() : String(value);
  });
  return record;
}

function sortByCreatedAtDesc(items) {
  return [...items].sort((left, right) => {
    const leftTime = Date.parse(left.createdAt || '');
    const rightTime = Date.parse(right.createdAt || '');
    return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
  });
}

function matchesSearch(item, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    item.createdAt,
    item.source,
    item.webinarTitle,
    item.fullName,
    item.country,
    item.identityType,
    item.identityNumber,
    item.passportCountry,
    item.email,
    item.whatsappNumber,
    item.category,
    item.notes,
  ]
    .map((value) => safeText(value).toLowerCase())
    .join(' ');

  return haystack.includes(query);
}

function setMessage(text, type = '') {
  adminMessage.textContent = text;
  adminMessage.className = `message ${type}`.trim();
}

function openParticipantForm() {
  window.open('/#participantForm', '_blank', 'noopener,noreferrer');
}

function makeBadge(text) {
  const badge = document.createElement('span');
  badge.className = 'badge';
  badge.textContent = text || '-';
  return badge;
}

function buildCell(text, className = '') {
  const cell = document.createElement('td');
  if (className) {
    cell.className = className;
  }
  cell.textContent = safeText(text) || '-';
  return cell;
}

function buildBadgeCell(text) {
  const cell = document.createElement('td');
  cell.appendChild(makeBadge(safeText(text) || '-'));
  return cell;
}

function renderSummary(items, source) {
  totalCount.textContent = String(totalRecords || items.length);
  latestCount.textContent = items.length > 0 ? formatDate(items[0].createdAt) : '-';
  sourceLabel.textContent = 'Local';

  const malaysiaCount = items.filter((item) => safeText(item.country) === 'Malaysia').length;
  const otherCount = items.length - malaysiaCount;
  countrySplit.textContent = items.length > 0 ? `Malaysia ${malaysiaCount} / Other ${otherCount}` : '-';
}

function renderTable(items) {
  submissionsBody.innerHTML = '';

  if (items.length === 0) {
    tableWrap.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = hasLoadedData
      ? 'Tiada rekod peserta ditemui.'
      : 'Muat data peserta untuk memaparkan senarai.';
    sourceHint.textContent = hasLoadedData
      ? (totalRecords > 0 ? `Tiada padanan daripada ${totalRecords} rekod.` : 'Tiada data untuk dipaparkan.')
      : 'Belum ada data dimuat.';
    return;
  }

  emptyState.hidden = true;
  tableWrap.hidden = false;

  items.forEach((item) => {
    const row = document.createElement('tr');
    row.appendChild(buildCell(formatDate(item.createdAt)));
    row.appendChild(buildBadgeCell(item.source));
    row.appendChild(buildCell(item.webinarTitle));
    row.appendChild(buildCell(item.fullName));
    row.appendChild(buildBadgeCell(item.country));
    row.appendChild(buildCell(item.identityNumber));
    row.appendChild(buildCell(item.email));
    row.appendChild(buildCell(item.whatsappNumber));
    row.appendChild(buildBadgeCell(item.category));

    const notesCell = buildCell(item.notes, 'admin-note');
    notesCell.title = safeText(item.notes);
    row.appendChild(notesCell);

    submissionsBody.appendChild(row);
  });

  sourceHint.textContent = `${items.length} rekod dipaparkan daripada ${totalRecords || allItems.length} rekod keseluruhan.`;
}

function renderView() {
  const query = safeText(searchInput.value).toLowerCase();
  const filteredItems = sortByCreatedAtDesc(allItems.filter((item) => matchesSearch(item, query)));
  renderSummary(allItems, activeSource);
  renderTable(filteredItems);
}

function downloadCsv(rows) {
  if (rows.length === 0) {
    setMessage('Tiada data untuk dieksport.', 'error');
    return;
  }

  const headers = [
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
    'category',
    'notes',
  ];

  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `participants-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadSubmissions() {
  loadButton.disabled = true;
  refreshButton.disabled = true;
  exportButton.disabled = true;
  setMessage('Memuat data peserta...', '');

  try {
    const response = await fetch('/api/submissions?limit=1000', { cache: 'no-store' });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Gagal memuat data peserta.');
    }

    activeSource = data.source || 'local-file';
    allItems = sortByCreatedAtDesc(
      Array.isArray(data.items) ? data.items.map(normalizeRecord) : []
    );
    totalRecords = Number(data.count ?? data.total ?? data.returnedCount ?? allItems.length) || allItems.length;
    hasLoadedData = true;
    renderView();
    setMessage(`Berjaya memuat ${allItems.length} rekod peserta.`, 'success');
  } catch (error) {
    hasLoadedData = false;
    allItems = [];
    totalRecords = 0;
    renderView();
    setMessage(error.message || 'Gagal memuat data peserta.', 'error');
  } finally {
    loadButton.disabled = false;
    refreshButton.disabled = false;
    exportButton.disabled = false;
  }
}

loadButton.addEventListener('click', async () => {
  await loadSubmissions();
});

addParticipantButton.addEventListener('click', () => {
  openParticipantForm();
});

refreshButton.addEventListener('click', async () => {
  await loadSubmissions();
});

searchInput.addEventListener('input', () => {
  renderView();
});

exportButton.addEventListener('click', () => {
  const query = safeText(searchInput.value).toLowerCase();
  const rows = sortByCreatedAtDesc(allItems.filter((item) => matchesSearch(item, query)));
  downloadCsv(rows);
});

renderView();
loadSubmissions();
