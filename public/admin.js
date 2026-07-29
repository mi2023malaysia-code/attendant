const adminMessage = document.getElementById('adminMessage');
const refreshButton = document.getElementById('refreshButton');
const exportButton = document.getElementById('exportButton');
const deleteFilteredButton = document.getElementById('deleteFilteredButton');
const submissionsBody = document.getElementById('submissionsBody');
const emptyState = document.getElementById('emptyState');
const tableWrap = document.getElementById('tableWrap');
const sourceHint = document.getElementById('sourceHint');
const totalCount = document.getElementById('totalCount');
const latestCount = document.getElementById('latestCount');
const nameFilterInput = document.getElementById('nameFilterInput');
const icFilterInput = document.getElementById('icFilterInput');
const courseFilterInput = document.getElementById('courseFilterInput');
const dateFromFilterInput = document.getElementById('dateFromFilterInput');
const dateToFilterInput = document.getElementById('dateToFilterInput');
const sortSelect = document.getElementById('sortSelect');
const clearFiltersButton = document.getElementById('clearFiltersButton');

const quickAddModal = document.getElementById('quickAddModal');
const quickAddBackdrop = document.getElementById('quickAddBackdrop');
const quickAddCloseButton = document.getElementById('quickAddCloseButton');
const quickAddForm = document.getElementById('quickAddForm');
const quickAddMessage = document.getElementById('quickAddMessage');
const quickAddSource = document.getElementById('quickAddSource');
const quickAddWebinarTitle = document.getElementById('quickAddWebinarTitle');
const quickAddFullName = document.getElementById('quickAddFullName');
const quickAddCountry = document.getElementById('quickAddCountry');
const quickAddIdentityLabel = document.getElementById('quickAddIdentityLabel');
const quickAddIdentityNumber = document.getElementById('quickAddIdentityNumber');
const quickAddPassportGroup = document.getElementById('quickAddPassportGroup');
const quickAddPassportCountry = document.getElementById('quickAddPassportCountry');
const quickAddIdentityGrid = document.getElementById('quickAddIdentityGrid');
const quickAddIdentityHelp = document.getElementById('quickAddIdentityHelp');
const quickAddEmail = document.getElementById('quickAddEmail');
const quickAddWhatsappNumber = document.getElementById('quickAddWhatsappNumber');
const quickAddWhatsappHelp = document.getElementById('quickAddWhatsappHelp');
const quickAddCategory = document.getElementById('quickAddCategory');
const quickAddNotes = document.getElementById('quickAddNotes');
const quickAddSubmitButton = document.getElementById('quickAddSubmitButton');
const quickAddResetButton = document.getElementById('quickAddResetButton');

let allItems = [];
let activeSource = 'local-file';
let hasLoadedData = false;
let totalRecords = 0;
let currentVisibleItems = [];
let isDeletingRecords = false;
let quickAddWebinarDefaultValue = '';
let quickAddWebinarsLoaded = false;
let quickAddWebinarsLoadingPromise = null;
let quickAddCategoryDefaultValue = '';
let quickAddCategoriesLoaded = false;
let quickAddCategoriesLoadingPromise = null;

function syncQuickAddSubmitState() {
  quickAddSubmitButton.disabled = !(quickAddWebinarsLoaded && quickAddCategoriesLoaded);
}

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

function toDateInputValue(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-CA');
}

function normalizeFilterText(value) {
  return safeText(value).toLowerCase();
}

function compareTextValues(left, right) {
  const leftText = safeText(left);
  const rightText = safeText(right);

  if (!leftText && !rightText) {
    return 0;
  }

  if (!leftText) {
    return 1;
  }

  if (!rightText) {
    return -1;
  }

  return leftText.localeCompare(rightText, 'ms', {
    sensitivity: 'base',
    numeric: true,
  });
}

function compareDateValues(left, right, direction = 'desc') {
  const leftTime = Date.parse(left || '');
  const rightTime = Date.parse(right || '');
  const leftValue = Number.isNaN(leftTime) ? 0 : leftTime;
  const rightValue = Number.isNaN(rightTime) ? 0 : rightTime;

  return direction === 'asc'
    ? leftValue - rightValue
    : rightValue - leftValue;
}

function normalizeDateRange(fromValue, toValue) {
  const from = safeText(fromValue);
  const to = safeText(toValue);

  if (from && to && from > to) {
    return { from: to, to: from };
  }

  return { from, to };
}

function getFilterState() {
  return {
    name: normalizeFilterText(nameFilterInput.value),
    ic: normalizeFilterText(icFilterInput.value),
    course: normalizeFilterText(courseFilterInput.value),
    dateFrom: safeText(dateFromFilterInput.value),
    dateTo: safeText(dateToFilterInput.value),
    sort: safeText(sortSelect.value) || 'date-desc',
    rawName: safeText(nameFilterInput.value),
    rawIc: safeText(icFilterInput.value),
    rawCourse: safeText(courseFilterInput.value),
    rawDateFrom: safeText(dateFromFilterInput.value),
    rawDateTo: safeText(dateToFilterInput.value),
  };
}

function matchesFilters(item, filters) {
  if (filters.name && !safeText(item.fullName).toLowerCase().includes(filters.name)) {
    return false;
  }

  if (filters.ic && !safeText(item.identityNumber).toLowerCase().includes(filters.ic)) {
    return false;
  }

  if (filters.course && !safeText(item.webinarTitle).toLowerCase().includes(filters.course)) {
    return false;
  }

  if (filters.dateFrom || filters.dateTo) {
    const createdDate = toDateInputValue(item.createdAt);
    if (!createdDate) {
      return false;
    }

    const { from, to } = normalizeDateRange(filters.dateFrom, filters.dateTo);

    if (from && createdDate < from) {
      return false;
    }

    if (to && createdDate > to) {
      return false;
    }
  }

  return true;
}

function sortItems(items, sortKey) {
  return [...items].sort((left, right) => {
    switch (sortKey) {
      case 'name-asc':
        return compareTextValues(left.fullName, right.fullName)
          || compareDateValues(left.createdAt, right.createdAt, 'desc');
      case 'course-asc':
        return compareTextValues(left.webinarTitle, right.webinarTitle)
          || compareDateValues(left.createdAt, right.createdAt, 'desc');
      case 'date-asc':
        return compareDateValues(left.createdAt, right.createdAt, 'asc')
          || compareTextValues(left.fullName, right.fullName);
      case 'date-desc':
      default:
        return compareDateValues(left.createdAt, right.createdAt, 'desc')
          || compareTextValues(left.fullName, right.fullName);
    }
  });
}

function getVisibleItems(filters = getFilterState()) {
  return sortItems(
    allItems.filter((item) => matchesFilters(item, filters)),
    filters.sort,
  );
}

function describeActiveFilters(filters) {
  const parts = [];

  if (filters.rawName) {
    parts.push(`nama "${filters.rawName}"`);
  }

  if (filters.rawIc) {
    parts.push(`IC "${filters.rawIc}"`);
  }

  if (filters.rawCourse) {
    parts.push(`course "${filters.rawCourse}"`);
  }

  if (filters.rawDateFrom || filters.rawDateTo) {
    const { from, to } = normalizeDateRange(filters.rawDateFrom, filters.rawDateTo);

    if (from && to) {
      parts.push(`tarikh ${from} hingga ${to}`);
    } else if (from) {
      parts.push(`tarikh dari ${from}`);
    } else if (to) {
      parts.push(`tarikh hingga ${to}`);
    }
  }

  return parts.join(', ');
}

function setMessage(text, type = '') {
  adminMessage.textContent = text;
  adminMessage.className = `message ${type}`.trim();
}

function setQuickAddMessage(text, type = '') {
  quickAddMessage.textContent = text;
  quickAddMessage.className = `message ${type}`.trim();
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

function buildActionCell(item) {
  const cell = document.createElement('td');
  cell.className = 'table-actions-cell';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'danger row-delete-button';
  button.textContent = 'Padam';
  button.title = `Padam ${safeText(item.fullName) || 'rekod ini'}`;
  button.disabled = isDeletingRecords;
  button.addEventListener('click', () => {
    void deleteRecords([item], `${safeText(item.fullName) || 'rekod ini'}`);
  });

  cell.appendChild(button);
  return cell;
}

async function requestDeleteRecords(ids) {
  const response = await fetch('/api/delete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ids }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.error || 'Padam gagal.');
  }

  return data;
}

async function deleteRecords(records, contextLabel = '') {
  const uniqueIds = [...new Set(
    records
      .map((item) => safeText(item.id))
      .filter(Boolean),
  )];

  if (uniqueIds.length === 0) {
    setMessage('Tiada rekod sah untuk dipadam.', 'error');
    return;
  }

  const context = safeText(contextLabel);
  const confirmMessage = context
    ? `Padam ${uniqueIds.length} rekod (${context})? Tindakan ini tidak boleh dibatalkan.`
    : `Padam ${uniqueIds.length} rekod yang dipilih? Tindakan ini tidak boleh dibatalkan.`;

  if (!window.confirm(confirmMessage)) {
    return;
  }

  isDeletingRecords = true;
  setMessage('Memadam rekod...', '');
  renderView();

  try {
    const data = await requestDeleteRecords(uniqueIds);
    const deletedIds = new Set(
      (Array.isArray(data.deletedIds) ? data.deletedIds : uniqueIds)
        .map((value) => safeText(value))
        .filter(Boolean),
    );
    const deletedCount = Number(data.deletedCount ?? deletedIds.size ?? uniqueIds.length) || uniqueIds.length;

    allItems = allItems.filter((item) => !deletedIds.has(item.id));
    if (Number.isFinite(totalRecords)) {
      totalRecords = Math.max(0, totalRecords - deletedCount);
    } else {
      totalRecords = allItems.length;
    }
    hasLoadedData = true;
    setMessage(`Berjaya memadam ${deletedCount} rekod.`, 'success');
  } catch (error) {
    setMessage(error.message || 'Padam gagal.', 'error');
  } finally {
    isDeletingRecords = false;
    renderView();
  }
}

function renderSummary(items) {
  totalCount.textContent = String(totalRecords || items.length);
  latestCount.textContent = items.length > 0 ? formatDate(items[0].createdAt) : '-';
}

function renderTable(items) {
  submissionsBody.innerHTML = '';

  if (items.length === 0) {
    tableWrap.hidden = true;
    emptyState.hidden = false;
    emptyState.textContent = hasLoadedData
      ? 'Tiada rekod peserta ditemui.'
      : 'Senarai peserta belum dipaparkan.';
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

    row.appendChild(buildActionCell(item));

    submissionsBody.appendChild(row);
  });

  sourceHint.textContent = `${items.length} rekod dipaparkan daripada ${totalRecords || allItems.length} rekod keseluruhan.`;
}

function renderView() {
  const filters = getFilterState();
  currentVisibleItems = getVisibleItems(filters);
  renderSummary(allItems);
  renderTable(currentVisibleItems);
  deleteFilteredButton.disabled = isDeletingRecords || currentVisibleItems.length === 0;
  deleteFilteredButton.textContent = isDeletingRecords ? 'Memadam...' : 'Padam ditapis';
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

  const link = document.createElement('a');
  let objectUrl = '';

  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
  } else {
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
  }

  link.download = `participants-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
  }
}

function populateQuickAddWebinars(items) {
  quickAddWebinarTitle.innerHTML = '';
  if (items.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Tiada tajuk webinar dalam Supabase.';
    option.disabled = true;
    option.selected = true;
    quickAddWebinarTitle.appendChild(option);
    quickAddWebinarDefaultValue = '';
    quickAddWebinarTitle.disabled = true;
    quickAddWebinarsLoaded = false;
    syncQuickAddSubmitState();
    return;
  }

  items.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label || item.value;
    option.defaultSelected = index === 0;
    option.selected = index === 0;
    quickAddWebinarTitle.appendChild(option);
  });

  quickAddWebinarDefaultValue = items[0]?.value || '';
  quickAddWebinarTitle.value = quickAddWebinarDefaultValue;
  quickAddWebinarTitle.disabled = false;
  quickAddWebinarsLoaded = true;
  syncQuickAddSubmitState();
}

async function loadQuickAddWebinars() {
  if (quickAddWebinarsLoadingPromise) {
    return quickAddWebinarsLoadingPromise;
  }

  quickAddWebinarsLoaded = false;
  syncQuickAddSubmitState();

  quickAddWebinarsLoadingPromise = (async () => {
    try {
      const response = await fetch('/api/webinars', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Gagal memuat tajuk webinar.');
      }

      const items = Array.isArray(data.items)
        ? data.items.filter((item) => item && typeof item.value === 'string' && item.value.trim())
        : [];

      populateQuickAddWebinars(items);
    } catch (error) {
      populateQuickAddWebinars([]);
      setQuickAddMessage(error.message || 'Gagal memuat tajuk webinar.', 'error');
    } finally {
      quickAddWebinarsLoadingPromise = null;
    }
  })();

  return quickAddWebinarsLoadingPromise;
}

function populateQuickAddCategories(items) {
  quickAddCategory.innerHTML = '';
  if (items.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Tiada kategori dalam Supabase.';
    option.disabled = true;
    option.selected = true;
    quickAddCategory.appendChild(option);
    quickAddCategoryDefaultValue = '';
    quickAddCategory.disabled = true;
    quickAddCategoriesLoaded = false;
    syncQuickAddSubmitState();
    return;
  }

  items.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label || item.value;
    option.defaultSelected = index === 0;
    option.selected = index === 0;
    quickAddCategory.appendChild(option);
  });

  quickAddCategoryDefaultValue = items[0]?.value || '';
  quickAddCategory.value = quickAddCategoryDefaultValue;
  quickAddCategory.disabled = false;
  quickAddCategoriesLoaded = true;
  syncQuickAddSubmitState();
}

async function loadQuickAddCategories() {
  if (quickAddCategoriesLoadingPromise) {
    return quickAddCategoriesLoadingPromise;
  }

  quickAddCategoriesLoaded = false;
  syncQuickAddSubmitState();

  quickAddCategoriesLoadingPromise = (async () => {
    try {
      const response = await fetch('/api/categories', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'Gagal memuat kategori.');
      }

      const items = Array.isArray(data.items)
        ? data.items.filter((item) => item && typeof item.value === 'string' && item.value.trim())
        : [];

      populateQuickAddCategories(items);
    } catch (error) {
      populateQuickAddCategories([]);
      setQuickAddMessage(error.message || 'Gagal memuat kategori.', 'error');
    } finally {
      quickAddCategoriesLoadingPromise = null;
    }
  })();

  return quickAddCategoriesLoadingPromise;
}

function syncQuickAddState() {
  const malaysia = quickAddCountry.value === 'Malaysia';

  if (malaysia) {
    quickAddIdentityLabel.textContent = 'No. Kad Pengenalan - Identity Card No.';
    quickAddIdentityHelp.hidden = false;
    quickAddIdentityNumber.placeholder = '900101011234';
    quickAddPassportGroup.hidden = true;
    quickAddPassportCountry.value = '';
    quickAddWhatsappNumber.placeholder = '+60123456789';
    quickAddWhatsappHelp.textContent = 'Malaysia - Malaysia: +60xxxxxxxxx. Sistem akan menormalkan nombor tempatan kepada format ini / The system will normalise local numbers to this format.';
  } else {
    quickAddIdentityLabel.textContent = 'No. Pasport - Passport No.';
    quickAddIdentityHelp.hidden = true;
    quickAddIdentityNumber.placeholder = 'A1234567';
    quickAddPassportGroup.hidden = false;
    quickAddWhatsappNumber.placeholder = '+447700900123';
    quickAddWhatsappHelp.textContent = 'Lain negara - Other countries: guna format antarabangsa E.164, contohnya +447700900123 / Use international E.164 format, e.g. +447700900123.';
  }

  quickAddPassportCountry.required = !malaysia;
  if (quickAddIdentityGrid) {
    quickAddIdentityGrid.classList.toggle('single', malaysia);
  }
}

function resetQuickAddForm() {
  quickAddForm.reset();
  quickAddSource.value = 'Codex';
  quickAddCountry.value = 'Malaysia';
  quickAddCategory.value = quickAddCategoryDefaultValue || quickAddCategory.value || '';
  quickAddWebinarTitle.value = quickAddWebinarDefaultValue || quickAddWebinarTitle.value || '';
  setQuickAddMessage('', '');
  syncQuickAddState();
}

function openQuickAddModal() {
  quickAddModal.hidden = false;
  document.body.classList.add('modal-open');
  resetQuickAddForm();

  if (!quickAddWebinarsLoaded || !quickAddCategoriesLoaded) {
    void Promise.all([loadQuickAddWebinars(), loadQuickAddCategories()]).then(() => {
      quickAddWebinarTitle.value = quickAddWebinarDefaultValue || quickAddWebinarTitle.value || '';
      quickAddCategory.value = quickAddCategoryDefaultValue || quickAddCategory.value || '';
      syncQuickAddState();
      syncQuickAddSubmitState();
    });
  }

  window.requestAnimationFrame(() => {
    quickAddFullName.focus();
  });
}

function closeQuickAddModal() {
  quickAddModal.hidden = true;
  document.body.classList.remove('modal-open');
  resetQuickAddForm();
  refreshButton.focus();
}

function buildQuickAddPayload() {
  return {
    source: safeText(quickAddSource.value) || 'Codex',
    webinarTitle: quickAddWebinarTitle.value,
    fullName: quickAddFullName.value,
    country: quickAddCountry.value,
    identityNumber: quickAddIdentityNumber.value,
    passportCountry: quickAddPassportCountry.value,
    email: quickAddEmail.value,
    whatsappNumber: quickAddWhatsappNumber.value,
    category: quickAddCategory.value,
    notes: quickAddNotes.value,
  };
}

function validateQuickAdd(payload) {
  const errors = [];

  if (!payload.source.trim()) errors.push('Source diperlukan.');
  if (!payload.webinarTitle.trim()) errors.push('Tajuk webinar diperlukan.');
  if (!payload.category.trim()) errors.push('Kategori diperlukan.');
  if (!payload.fullName.trim()) errors.push('Nama penuh diperlukan.');
  if (!payload.email.trim()) errors.push('Email diperlukan.');
  if (!payload.identityNumber.trim()) errors.push('Nombor identiti diperlukan.');
  if (!payload.whatsappNumber.trim()) errors.push('Nombor WhatsApp diperlukan.');

  if (payload.country === 'Malaysia') {
    const digits = payload.identityNumber.replace(/\D/g, '');
    if (digits.length !== 12) errors.push('NRIC Malaysia mesti ada 12 digit.');
    const whats = payload.whatsappNumber.replace(/\D/g, '');
    if (!(whats.startsWith('60') || whats.startsWith('0') || payload.whatsappNumber.startsWith('+60'))) {
      errors.push('WhatsApp Malaysia mesti bermula dengan +60 atau nombor tempatan.');
    }
  } else {
    if (!payload.passportCountry.trim()) errors.push('Negara passport diperlukan.');
    if (!payload.whatsappNumber.trim().startsWith('+')) errors.push('WhatsApp luar negara mesti bermula dengan +.');
  }

  return errors;
}

async function submitQuickAddForm(event) {
  event.preventDefault();

  const payload = buildQuickAddPayload();
  const errors = validateQuickAdd(payload);
  if (errors.length > 0) {
    setQuickAddMessage(errors[0], 'error');
    return;
  }

  quickAddSubmitButton.disabled = true;
  setQuickAddMessage('Sedang simpan data...', '');

  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Simpanan gagal.');
    }

    const savedRecord = normalizeRecord(data.record || payload);
    allItems = sortItems([
      savedRecord,
      ...allItems.filter((item) => item.id !== savedRecord.id),
    ], 'date-desc');
    totalRecords = Number.isFinite(totalRecords) ? totalRecords + 1 : allItems.length;
    hasLoadedData = true;
    renderView();
    closeQuickAddModal();
    setMessage('Peserta berjaya ditambah ke peserta.csv.', 'success');
  } catch (error) {
    setQuickAddMessage(error.message || 'Simpanan gagal.', 'error');
  } finally {
    syncQuickAddSubmitState();
  }
}

async function loadSubmissions() {
  refreshButton.disabled = true;
  exportButton.disabled = true;
  deleteFilteredButton.disabled = true;
  setMessage('Memuat senarai peserta...', '');

  try {
    const response = await fetch('/api/submissions?limit=1000', { cache: 'no-store' });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Gagal memuat data peserta.');
    }

    activeSource = data.source || 'local-file';
    allItems = sortItems(
      Array.isArray(data.items) ? data.items.map(normalizeRecord) : [],
      'date-desc',
    );
    totalRecords = Number(data.count ?? data.total ?? data.returnedCount ?? allItems.length) || allItems.length;
    hasLoadedData = true;
    renderView();
    setMessage(`Berjaya memuat ${allItems.length} rekod peserta dari ${activeSource === 'supabase' ? 'Supabase' : 'storan tempatan'}.`, 'success');
  } catch (error) {
    hasLoadedData = false;
    allItems = [];
    totalRecords = 0;
    renderView();
    setMessage(error.message || 'Gagal memuat data peserta.', 'error');
  } finally {
    refreshButton.disabled = false;
    exportButton.disabled = false;
  }
}

refreshButton.addEventListener('click', async () => {
  await loadSubmissions();
});

quickAddCountry.addEventListener('change', () => {
  syncQuickAddState();
});

quickAddForm.addEventListener('submit', submitQuickAddForm);
quickAddResetButton.addEventListener('click', () => {
  resetQuickAddForm();
});
quickAddCloseButton.addEventListener('click', () => {
  closeQuickAddModal();
});
quickAddBackdrop.addEventListener('click', () => {
  closeQuickAddModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !quickAddModal.hidden) {
    closeQuickAddModal();
  }
});

[
  nameFilterInput,
  icFilterInput,
  courseFilterInput,
  dateFromFilterInput,
  dateToFilterInput,
].forEach((input) => {
  input.addEventListener('input', () => {
    renderView();
  });
});

sortSelect.addEventListener('change', () => {
  renderView();
});

clearFiltersButton.addEventListener('click', () => {
  nameFilterInput.value = '';
  icFilterInput.value = '';
  courseFilterInput.value = '';
  dateFromFilterInput.value = '';
  dateToFilterInput.value = '';
  sortSelect.value = 'date-desc';
  renderView();
});

exportButton.addEventListener('click', () => {
  const rows = currentVisibleItems.length > 0 ? currentVisibleItems : getVisibleItems();
  downloadCsv(rows);
});

deleteFilteredButton.addEventListener('click', () => {
  void deleteRecords(currentVisibleItems, describeActiveFilters(getFilterState()) || 'penapis semasa');
});

syncQuickAddState();
syncQuickAddSubmitState();
void loadQuickAddWebinars();
void loadQuickAddCategories();
renderView();
void loadSubmissions();
