const form = document.getElementById('participantForm');
const country = document.getElementById('country');
const identityLabel = document.getElementById('identityLabel');
const identityNumber = document.getElementById('identityNumber');
const passportGroup = document.getElementById('passportGroup');
const passportCountry = document.getElementById('passportCountry');
const identityGrid = document.getElementById('identityGrid');
const identityHelp = document.getElementById('identityHelp');
const whatsappNumber = document.getElementById('whatsappNumber');
const whatsappHelp = document.getElementById('whatsappHelp');
const message = document.getElementById('formMessage');
const saveButton = document.getElementById('saveButton');
const resetButton = document.getElementById('resetButton');

const sourceInputs = Array.from(document.querySelectorAll('input[name="source"]'));
const webinarTitle = document.getElementById('webinarTitle');
const category = document.getElementById('category');
const fullName = document.getElementById('fullName');
const email = document.getElementById('email');
const notes = document.getElementById('notes');

const fallbackWebinars = [
  { value: '101-codex', label: '101-codex' },
  { value: '102-claude', label: '102-claude' },
  { value: '103-chagrpt', label: '103-chagrpt' },
];

let webinarDefaultValue = '';

function currentSource() {
  return sourceInputs.find((input) => input.checked)?.value || 'Codex';
}

function isMalaysia() {
  return country.value === 'Malaysia';
}

function syncDynamicState() {
  const malaysia = isMalaysia();

  if (malaysia) {
    identityLabel.textContent = 'No. Kad Pengenalan - Identity Card No.';
    identityHelp.hidden = false;
    identityNumber.placeholder = '900101011234';
    passportGroup.hidden = true;
    passportCountry.value = '';
    whatsappNumber.placeholder = '+60123456789';
    whatsappHelp.textContent = 'Malaysia - Malaysia: +60xxxxxxxxx. Sistem akan menormalkan nombor tempatan kepada format ini / The system will normalise local numbers to this format.';
  } else {
    identityLabel.textContent = 'No. Pasport - Passport No.';
    identityHelp.hidden = true;
    identityNumber.placeholder = 'A1234567';
    passportGroup.hidden = false;
    whatsappNumber.placeholder = '+447700900123';
    whatsappHelp.textContent = 'Lain negara - Other countries: guna format antarabangsa E.164, contohnya +447700900123 / Use international E.164 format, e.g. +447700900123.';
  }

  passportCountry.required = !malaysia;
  if (identityGrid) {
    identityGrid.classList.toggle('single', malaysia);
  }
}

function formatNricPreview(value) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (digits.length === 12) {
    return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
  }
  return digits || 'NRIC';
}

function normalizeMalaysiaWhatsAppPreview(value) {
  const digits = value.replace(/\D/g, '');
  let normalized = digits;
  if (normalized.startsWith('60')) {
    normalized = normalized.slice(2);
  }
  if (normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }
  if (!normalized) {
    return '+60...';
  }
  return `+60${normalized}`;
}

function normalizeInternationalWhatsAppPreview(value) {
  const cleaned = value.trim().replace(/[\s-]/g, '');
  return cleaned || '+...';
}

function updatePreview() {
  return;
}

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function populateWebinars(items) {
  const options = items.length > 0 ? items : fallbackWebinars;

  webinarTitle.innerHTML = '';
  options.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label || item.value;
    option.defaultSelected = index === 0;
    option.selected = index === 0;
    webinarTitle.appendChild(option);
  });

  webinarDefaultValue = options[0]?.value || '';
  webinarTitle.value = webinarDefaultValue;
  webinarTitle.disabled = false;
}

async function loadWebinars() {
  webinarTitle.disabled = true;
  saveButton.disabled = true;

  try {
    const response = await fetch('/api/webinars', { cache: 'no-store' });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.error || 'Gagal memuat tajuk webinar.');
    }

    const items = Array.isArray(data.items)
      ? data.items.filter((item) => item && typeof item.value === 'string' && item.value.trim())
      : [];

    populateWebinars(items);
  } catch (error) {
    populateWebinars(fallbackWebinars);
    setMessage(error.message || 'Gagal memuat tajuk webinar.', 'error');
  } finally {
    saveButton.disabled = false;
  }
}

async function loadRecent() {
  return;
}

function renderRecent(items) {
  return items;
}

function escapeHtml(value) {
  return String(value);
}

function validateClient(payload) {
  const errors = [];

  if (!payload.webinarTitle.trim()) errors.push('Tajuk webinar diperlukan.');
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

async function submitForm(event) {
  event.preventDefault();

  const payload = {
    source: currentSource(),
    webinarTitle: webinarTitle.value,
    fullName: fullName.value,
    country: country.value,
    identityNumber: identityNumber.value,
    passportCountry: passportCountry.value,
    email: email.value,
    whatsappNumber: whatsappNumber.value,
    category: category.value,
    notes: notes.value,
  };

  const errors = validateClient(payload);
  if (errors.length) {
    setMessage(errors[0], 'error');
    return;
  }

  saveButton.disabled = true;
  setMessage('Sedang simpan data...', '');

  try {
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'Simpanan gagal.');
    }

    setMessage('Disimpan dengan berjaya.', 'success');
    form.reset();
    country.value = 'Malaysia';
    webinarTitle.value = webinarDefaultValue;
    syncDynamicState();
    updatePreview();
    await loadRecent();
  } catch (error) {
    setMessage(error.message, 'error');
  } finally {
    saveButton.disabled = false;
  }
}

function handleReset() {
  form.reset();
  country.value = 'Malaysia';
  webinarTitle.value = webinarDefaultValue;
  syncDynamicState();
  updatePreview();
  setMessage('', '');
}

sourceInputs.forEach((input) => {
  input.addEventListener('change', updatePreview);
});

[
  webinarTitle,
  country,
  identityNumber,
  whatsappNumber,
  category,
  fullName,
  email,
  notes,
  passportCountry,
].forEach((element) => {
  element.addEventListener('input', updatePreview);
  element.addEventListener('change', updatePreview);
});

country.addEventListener('change', () => {
  syncDynamicState();
  updatePreview();
});

form.addEventListener('submit', submitForm);
resetButton.addEventListener('click', handleReset);
syncDynamicState();
updatePreview();
loadWebinars();
loadRecent();
