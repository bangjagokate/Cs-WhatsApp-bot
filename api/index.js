const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { getContacts, getMessages, getBotRules, saveOrUpdateContact, saveBotRule, getAllRecords } = require('../config/database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/ping', (req, res) => res.status(200).json({ status: 'ONLINE', timestamp: new Date().toISOString() }));

app.get('/api/qr-status', async (req, res) => {
  try {
    const records = await getAllRecords();
    const qrRecords = records.filter(r => r && r.type === 'system_qr');

    if (qrRecords.length > 0) {
      // Cari record terbawah yang memiliki status CONNECTED atau Memiliki String QR
      for (let i = qrRecords.length - 1; i >= 0; i--) {
        const item = qrRecords[i];
        if (item.status === 'CONNECTED') {
          return res.json({ status: 'CONNECTED', qrDataUrl: '' });
        }
        if (item.qrDataUrl && item.qrDataUrl.length > 5) {
          return res.json({
            status: item.status || 'DISCONNECTED',
            qrDataUrl: item.qrDataUrl
          });
        }
      }
    }
    return res.json({ status: 'DISCONNECTED', qrDataUrl: '' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

app.get('/api/contacts', async (req, res) => {
  const contacts = await getContacts();
  res.json(contacts);
});

app.get('/api/messages/:jid', async (req, res) => {
  const messages = await getMessages(req.params.jid);
  res.json(messages);
});

app.post('/api/mode', async (req, res) => {
  const { jid, mode } = req.body;
  await saveOrUpdateContact(jid, { mode, step: mode === 'bot' ? 'MAIN_MENU' : 'HUMAN' });
  res.json({ success: true });
});

app.get('/api/bot/rules', async (req, res) => {
  const rules = await getBotRules();
  res.json(rules);
});

app.post('/api/bot/rules', async (req, res) => {
  const { keyword, reply_text, next_step, options_json } = req.body;
  await saveBotRule(keyword, reply_text, next_step, options_json);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT);

module.exports = app;
