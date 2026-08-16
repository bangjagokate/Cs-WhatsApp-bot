const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabaseSchema, getRows, appendRow, updateContact } = require('../config/googleSheets');
const { processIncomingMessage } = require('../services/botEngine');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Google Sheets DB Schema
initDatabaseSchema();

// REST API endpoints for Vercel & Web Dashboard
app.get('/api/contacts', async (req, res) => {
  const rows = await getRows('Contacts');
  const contacts = rows.map(r => ({
    jid: r[0],
    name: r[1],
    mode: r[2],
    step: r[3],
    updatedAt: r[7]
  }));
  res.json(contacts.reverse());
});

app.get('/api/messages/:jid', async (req, res) => {
  const rows = await getRows('Messages');
  const messages = rows
    .filter(r => r[0] === req.params.jid)
    .map(r => ({ jid: r[0], sender_type: r[1], text: r[2], created_at: r[3] }));
  res.json(messages);
});

app.post('/api/mode', async (req, res) => {
  const { jid, mode } = req.body;
  await updateContact(jid, { mode, step: mode === 'bot' ? 'MAIN_MENU' : 'HUMAN' });
  res.json({ success: true });
});

app.get('/api/bot/rules', async (req, res) => {
  const rows = await getRows('Bot_Menus');
  const rules = rows.map(r => ({
    keyword: r[0],
    reply_text: r[1],
    next_step: r[2],
    options_json: r[3]
  }));
  res.json(rules);
});

app.post('/api/bot/rules', async (req, res) => {
  const { keyword, reply_text, next_step, options_json } = req.body;
  await appendRow('Bot_Menus', [keyword.toUpperCase().trim(), reply_text, next_step || 'MAIN_MENU', options_json || '']);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`CS Center Server active on port ${PORT}`));
}

module.exports = app;
