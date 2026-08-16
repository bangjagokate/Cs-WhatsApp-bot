const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { getContacts, getMessages, getBotRules, saveOrUpdateContact, saveBotRule, getAllRecords } = require('../config/database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Keep-Alive Ping
app.get('/api/ping', (req, res) => res.status(200).json({ status: 'ONLINE' }));

// API: QR Status (DIPERBAIKI)
app.get('/api/qr-status', async (req, res) => {
  try {
    const records = await getAllRecords();
    const qrRecords = records.filter(r => r && r.type === 'system_qr');
    
    if (qrRecords.length > 0) {
      const latest = qrRecords[qrRecords.length - 1];
      return res.json({
        status: latest.status || 'DISCONNECTED',
        qrDataUrl: latest.qrDataUrl || ''
      });
    }
    return res.json({ status: 'DISCONNECTED', qrDataUrl: '' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

// API: Contacts
app.get('/api/contacts', async (req, res) => {
  const contacts = await getContacts();
  res.json(contacts);
});

// API: Messages
app.get('/api/messages/:jid', async (req, res) => {
  const messages = await getMessages(req.params.jid);
  res.json(messages);
});

// API: Mode Toggle
app.post('/api/mode', async (req, res) => {
  const { jid, mode } = req.body;
  await saveOrUpdateContact(jid, { mode, step: mode === 'bot' ? 'MAIN_MENU' : 'HUMAN' });
  res.json({ success: true });
});

// API: Rules
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
