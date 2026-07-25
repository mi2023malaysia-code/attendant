const SHEET_NAME = 'Participants';

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, message: 'Participant intake Apps Script is ready.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');

    if (!spreadsheetId) {
      throw new Error('SPREADSHEET_ID script property is not set.');
    }

    const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(SHEET_NAME) ||
      SpreadsheetApp.openById(spreadsheetId).insertSheet(SHEET_NAME);

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
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
