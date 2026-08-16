const fetch = require('node-fetch');

const API_BASE_URL = 'https://databasetele.pie.host/api/db/cswa/records';
const API_KEY = process.env.DB_API_KEY || 'key_a2fda27a81d34fec366a7151';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`
};

async function getAllRecords() {
  try {
    const response = await fetch(API_BASE_URL, { method: 'GET', headers });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : (data.records || []);
  } catch (error) {
    console.error('Remote DB Fetch Error:', error.message);
    return [];
  }
}

async function createRecord(recordData) {
  try {
    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...recordData,
        createdAt: new Date().toISOString()
      })
    });
    return await response.json();
  } catch (error) {
    console.error('Remote DB Create Error:', error.message);
    return null;
  }
}

async function getContacts() {
  const all = await getAllRecords();
  return all.filter(item => item.type === 'contact');
}

async function getMessages(jid) {
  const all = await getAllRecords();
  return all.filter(item => item.type === 'message' && item.jid === jid);
}

async function getBotRules() {
  const all = await getAllRecords();
  return all.filter(item => item.type === 'bot_rule');
}

async function saveOrUpdateContact(jid, data) {
  const contacts = await getContacts();
  const existing = contacts.find(c => c.jid === jid);

  if (existing) {
    await createRecord({
      ...existing,
      ...data,
      updatedAt: new Date().toISOString()
    });
  } else {
    await createRecord({
      type: 'contact',
      jid,
      name: data.name || 'Pelanggan',
      mode: data.mode || 'bot',
      step: data.step || 'MAIN_MENU',
      tempName: data.tempName || '',
      tempWeight: data.tempWeight || '',
      tempAddress: data.tempAddress || '',
      updatedAt: new Date().toISOString()
    });
  }
}

async function saveMessage(jid, senderType, text) {
  await createRecord({
    type: 'message',
    jid,
    senderType,
    text,
    createdAt: new Date().toISOString()
  });
}

async function saveBotRule(keyword, replyText, nextStep, optionsJson) {
  await createRecord({
    type: 'bot_rule',
    keyword: keyword.toUpperCase().trim(),
    replyText,
    nextStep: nextStep || 'MAIN_MENU',
    optionsJson: optionsJson || ''
  });
}

module.exports = {
  getAllRecords,
  createRecord,
  getContacts,
  getMessages,
  getBotRules,
  saveOrUpdateContact,
  saveMessage,
  saveBotRule
};
