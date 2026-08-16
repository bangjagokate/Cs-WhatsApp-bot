const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');
require('dotenv').config();

const { getContacts, getMessages, getBotRules, saveOrUpdateContact, saveMessage, saveBotRule } = require('../config/database');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Ping Endpoint
app.get('/api/ping', (req, res) => res.status(200).json({ status: 'ONLINE', mode: 'Meta Cloud API Engine' }));

// Contacts & Messages
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

// Admin Reply Message via Meta Cloud API
app.post('/api/webhook/message', async (req, res) => {
  const { jid, text } = req.body;
  const phoneNumber = jid.split('@')[0];

  const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
  const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

  try {
    await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: text }
      })
    });

    await saveMessage(jid, 'admin', text);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT);

module.exports = app;
