const PARTICIPANT_SHEET_NAME = 'Participants';
const WEBINAR_SHEET_NAME = 'webinar';

function createJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function getSpreadsheet() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID script property is not set.');
  }

  return SpreadsheetApp.openById(spreadsheetId);
}

function parseWebinarRows(values) {
  const rows = (values || [])
    .map((row) => row.map((cell) => String(cell || '').trim()))
    .filter((row) => row.some((cell) => cell));

  if (rows.length === 0) {
    return [];
  }

  const headerTokens = new Set(['value', 'label', 'title', 'webinartitle', 'code', 'slug', 'id', 'name', 'display']);
  const firstRow = rows[0].map((cell) => cell.toLowerCase());
  const hasHeader = firstRow.some((cell) => headerTokens.has(cell));

  if (!hasHeader) {
    return rows
      .map((row) => {
        const value = String(row[0] || '').trim();
        if (!value) {
          return null;
        }

        const label = String(row[1] || value).trim() || value;
        return { value: value, label: label };
      })
      .filter(Boolean);
  }

  const header = rows[0].map((cell) => cell.toLowerCase());
  const valueIndex = header.findIndex((cell) => cell === 'value' || cell === 'title' || cell === 'webinartitle' || cell === 'code' || cell === 'slug' || cell === 'id');
  const labelIndex = header.findIndex((cell) => cell === 'label' || cell === 'name' || cell === 'display');

  return rows
    .slice(1)
    .map((row) => {
      const value = String(row[valueIndex >= 0 ? valueIndex : 0] || '').trim();
      if (!value) {
        return null;
      }

      const labelSource = labelIndex >= 0 ? row[labelIndex] : row[valueIndex >= 0 ? valueIndex : 0];
      const label = String(labelSource || value).trim() || value;
      return { value: value, label: label };
    })
    .filter(Boolean);
}

function loadWebinarItemsFromSheet(sheetName) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    return [];
  }

  const values = sheet.getDataRange().getDisplayValues();
  return parseWebinarRows(values);
}

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '').trim().toLowerCase();

  if (action === 'webinars') {
    try {
      const sheetName = String((e && e.parameter && e.parameter.sheet) || WEBINAR_SHEET_NAME).trim() || WEBINAR_SHEET_NAME;
      const items = loadWebinarItemsFromSheet(sheetName);
      return createJsonResponse({ ok: true, items: items, sheet: sheetName });
    } catch (error) {
      return createJsonResponse({ ok: false, error: error.message });
    }
  }

  return createJsonResponse({ ok: true, message: 'Participant intake Apps Script is ready.' });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const spreadsheet = getSpreadsheet();
    const sheet = spreadsheet.getSheetByName(PARTICIPANT_SHEET_NAME) ||
      spreadsheet.insertSheet(PARTICIPANT_SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
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
        'consent',
        'notes',
      ]);
    }

    sheet.appendRow([
      payload.createdAt || new Date().toISOString(),
      payload.source || '',
      payload.webinarTitle || '',
      payload.fullName || '',
      payload.country || '',
      payload.identityType || '',
      payload.identityNumber || '',
      payload.passportCountry || '',
      payload.email || '',
      payload.whatsappNumber || '',
      payload.category || '',
      payload.consent || '',
      payload.notes || '',
    ]);

    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return createJsonResponse({ ok: false, error: error.message });
  }
}
