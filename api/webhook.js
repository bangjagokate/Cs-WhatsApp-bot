const fetch = require('node-fetch');
const { getContacts, getBotRules, saveOrUpdateContact, saveMessage } = require('../config/database');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'hanifa_laundry_secret_token';

// Helper Send Message Meta Cloud API
async function sendWhatsAppMessage(to, text) {
  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: text }
      })
    });
    return await response.json();
  } catch (err) {
    console.error('Failed to send Meta WA message:', err.message);
    return null;
  }
}

module.exports = async (req, res) => {
  // 1. Verifikasi Webhook Meta (GET Request)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return res.status(200).send(challenge);
    } else {
      return res.status(403).json({ error: 'Verification failed' });
    }
  }

  // 2. Terima Event Pesan Masuk (POST Request)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
        const messageData = body.entry[0].changes[0].value.messages[0];
        const contactData = body.entry[0].changes[0].value.contacts[0];

        const fromNumber = messageData.from; // Nomor WA Pelanggan (e.g. 628123456789)
        const jid = `${fromNumber}@s.whatsapp.net`;
        const pushName = contactData?.profile?.name || 'Pelanggan';
        const messageText = messageData.type === 'text' ? messageData.text.body.trim() : '';

        if (messageText) {
          // Simpan pesan masuk pelanggan
          await saveMessage(jid, 'user', messageText);

          // Cek Mode Kontak (Bot vs CS Human)
          const contacts = await getContacts();
          let currentContact = contacts.find(c => c.jid === jid);

          if (!currentContact) {
            await saveOrUpdateContact(jid, { name: pushName, mode: 'bot', step: 'MAIN_MENU' });
            currentContact = { jid, name: pushName, mode: 'bot', step: 'MAIN_MENU' };
          }

          // Jika mode = BOT, proses Auto-Reply
          if (currentContact.mode === 'bot') {
            const rules = await getBotRules();
            const matchedRule = rules.find(r => r.keyword === messageText.toUpperCase());

            let replyText = "";
            if (matchedRule) {
              replyText = matchedRule.replyText;
            } else {
              replyText = `Halo Kak ${pushName}! Selamat datang di Hanifa Laundry 😊\n\nSilakan pilih menu:\n1. Cek Tarif\n2. Status Laundry\n3. Bicara dengan CS Admin`;
            }

            // Kirim balasan via Meta Cloud API & Simpan ke DB
            await sendWhatsAppMessage(fromNumber, replyText);
            await saveMessage(jid, 'bot', replyText);
          }
        }
      }

      return res.status(200).json({ status: 'EVENT_RECEIVED' });
    } catch (error) {
      console.error('Webhook Error:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).end(`Method ${req.method} Not Allowed`);
};
