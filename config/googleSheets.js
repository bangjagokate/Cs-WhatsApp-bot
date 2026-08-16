const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '';

const auth = new google.auth.JWT(
  CLIENT_EMAIL,
  null,
  PRIVATE_KEY,
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });

async function initDatabaseSchema() {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetTitles = meta.data.sheets.map(s => s.properties.title);

    if (!sheetTitles.includes('Contacts')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: 'Contacts' } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Contacts!A1:H1',
        valueInputOption: 'RAW',
        requestBody: { values: [['JID', 'Name', 'Mode', 'Step', 'TempName', 'TempWeight', 'TempAddress', 'UpdatedAt']] }
      });
    }

    if (!sheetTitles.includes('Messages')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: 'Messages' } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Messages!A1:D1',
        valueInputOption: 'RAW',
        requestBody: { values: [['JID', 'SenderType', 'Text', 'CreatedAt']] }
      });
    }

    if (!sheetTitles.includes('Bot_Menus')) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: 'Bot_Menus' } } }] }
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Bot_Menus!A1:D1',
        valueInputOption: 'RAW',
        requestBody: { values: [['Keyword', 'ReplyText', 'NextStep', 'OptionsJson']] }
      });
    }
  } catch (error) {
    console.error('Google Sheets Schema Init Error:', error.message);
  }
}

async function getRows(sheetName) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A2:Z1000`
    });
    return res.data.values || [];
  } catch (err) {
    return [];
  }
}

async function appendRow(sheetName, values) {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [values] }
    });
  } catch (err) {
    console.error(`Append ${sheetName} Error:`, err.message);
  }
}

async function updateContact(jid, data) {
  try {
    const rows = await getRows('Contacts');
    const rowIndex = rows.findIndex(r => r[0] === jid);
    const now = new Date().toISOString();

    if (rowIndex !== -1) {
      const current = rows[rowIndex];
      const updated = [
        jid,
        data.name !== undefined ? data.name : current[1],
        data.mode !== undefined ? data.mode : current[2],
        data.step !== undefined ? data.step : current[3],
        data.tempName !== undefined ? data.tempName : (current[4] || ''),
        data.tempWeight !== undefined ? data.tempWeight : (current[5] || ''),
        data.tempAddress !== undefined ? data.tempAddress : (current[6] || ''),
        now
      ];
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Contacts!A${rowIndex + 2}:H${rowIndex + 2}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [updated] }
      });
    } else {
      await appendRow('Contacts', [
        jid,
        data.name || 'Pelanggan',
        data.mode || 'bot',
        data.step || 'MAIN_MENU',
        data.tempName || '',
        data.tempWeight || '',
        data.tempAddress || '',
        now
      ]);
    }
  } catch (err) {
    console.error('Update Contact Error:', err.message);
  }
}

module.exports = { initDatabaseSchema, getRows, appendRow, updateContact };
