const { getRows, appendRow, updateContact } = require('../config/googleSheets');

async function sendWASafely(waSock, jid, text) {
  if (!waSock) return;
  try {
    await waSock.sendPresenceUpdate('composing', jid);
    const delayMs = Math.min(Math.max(text.length * 40, 1500), 4000);
    await new Promise(r => setTimeout(r, delayMs));
    await waSock.sendPresenceUpdate('paused', jid);
    await waSock.sendMessage(jid, { text });
  } catch (e) {
    console.error('Safe Send Error:', e.message);
  }
}

async function processIncomingMessage(waSock, msg) {
  if (!msg.message || msg.key.fromMe) return;

  const jid = msg.key.remoteJid;
  if (jid.includes('@g.us')) return;

  const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
  const pushName = msg.pushName || jid.split('@')[0];

  const contactsRaw = await getRows('Contacts');
  let contactRow = contactsRaw.find(r => r[0] === jid);

  let contact = {
    jid,
    name: contactRow ? contactRow[1] : pushName,
    mode: contactRow ? contactRow[2] : 'bot',
    step: contactRow ? contactRow[3] : 'MAIN_MENU',
    tempName: contactRow ? contactRow[4] : '',
    tempWeight: contactRow ? contactRow[5] : '',
    tempAddress: contactRow ? contactRow[6] : ''
  };

  if (!contactRow) {
    await updateContact(jid, { name: pushName, mode: 'bot', step: 'MAIN_MENU' });
  }

  await appendRow('Messages', [jid, 'user', text, new Date().toISOString()]);

  // Trigger CS Human
  if (['cs', 'bantuan', 'admin'].includes(text.toLowerCase())) {
    await updateContact(jid, { mode: 'human', step: 'HUMAN' });
    const reply = "Permintaan diterima! Anda sekarang terhubung dengan Customer Service (Human). Sampaikan kendala Anda.";
    await sendWASafely(waSock, jid, reply);
    await appendRow('Messages', [jid, 'bot', reply, new Date().toISOString()]);
    return;
  }

  if (contact.mode === 'bot') {
    const inputRaw = text.toUpperCase().trim();
    let replyText = "";

    if (['0', 'BATAL', 'KEMBALI'].includes(inputRaw)) {
      await updateContact(jid, { step: 'MAIN_MENU', tempName: '', tempWeight: '', tempAddress: '' });
      replyText = "Kembali ke Menu Utama.\n\n1. Cuci Pakaian (Kiloan)\n2. Cuci Sepatu/Helm/Tas\n3. Daftar Harga\n4. Lokasi Workshop\n5. Bicara CS Admin";
      await sendWASafely(waSock, jid, replyText);
      await appendRow('Messages', [jid, 'bot', replyText, new Date().toISOString()]);
      return;
    }

    // Step 1: Input Nama
    if (contact.step === 'STEP_NAME_REGULAR' || contact.step === 'STEP_NAME_EXPRESS') {
      const isExp = contact.step === 'STEP_NAME_EXPRESS';
      const nextStep = isExp ? 'STEP_WEIGHT_EXPRESS' : 'STEP_WEIGHT_REGULAR';
      await updateContact(jid, { step: nextStep, tempName: text });
      replyText = `Terima kasih Sdr/i *${text}*.\n\nLangkah 2/3: Silakan masukkan *Estimasi Perkiraan Berat Pakaian (kg)*:\n(Contoh: 5 kg)`;
    } 
    // Step 2: Input Berat
    else if (contact.step === 'STEP_WEIGHT_REGULAR' || contact.step === 'STEP_WEIGHT_EXPRESS') {
      const isExp = contact.step === 'STEP_WEIGHT_EXPRESS';
      const nextStep = isExp ? 'STEP_ADDRESS_EXPRESS' : 'STEP_ADDRESS_REGULAR';
      await updateContact(jid, { step: nextStep, tempWeight: text });
      replyText = `Perkiraan berat *${text}* dicatat.\n\nLangkah 3/3: Silakan masukkan *Alamat Lengkap Pickup / Penjemputan* Anda:`;
    }
    // Step 3: Input Alamat & Rangkuman Data Pemesan
    else if (contact.step === 'STEP_ADDRESS_REGULAR' || contact.step === 'STEP_ADDRESS_EXPRESS') {
      const isExp = contact.step === 'STEP_ADDRESS_EXPRESS';
      await updateContact(jid, { step: 'CONFIRM_ORDER', tempAddress: text });

      const serviceName = isExp ? "Cuci Pakaian Express (1 Hari)" : "Cuci Pakaian Regular (3 Hari)";
      const serviceRate = isExp ? "Rp 10.000 / kg" : "Rp 6.000 / kg";

      replyText = `📋 *KOREKSI & KONFIRMASI DATA PESANAN*\n----------------------------------------\n• Layanan: ${serviceName}\n• Tarif: ${serviceRate}\n• Atas Nama: ${contact.tempName || pushName}\n• Perkiraan Berat: ${contact.tempWeight || '-'}\n• Alamat Pickup: ${text}\n----------------------------------------\nMohon periksa data di atas. Apakah data sudah benar dan Anda setuju untuk dijemput?\n\nKetik *SETUJU* untuk konfirmasi penjemputan.\nKetik *0* untuk membatalkan.`;
    }
    // Step 4: Final Settlement / SETUJU
    else if (contact.step === 'CONFIRM_ORDER' && (inputRaw === 'SETUJU' || inputRaw.includes('SETUJU'))) {
      await updateContact(jid, { mode: 'human', step: 'HUMAN' });
      replyText = "✅ *PESANAN BERHASIL DICATAT & KOREKSI SETUJU!*\n\nTerima kasih! Rangkuman data Anda telah masuk ke sistem Hanifa Laundry. Kurir kami akan segera menuju lokasi Anda.\n\nLayanan beralih ke Admin CS (Human).";
      await sendWASafely(waSock, jid, replyText);
      await appendRow('Messages', [jid, 'bot', replyText, new Date().toISOString()]);
      return;
    }
    // Dynamic Rules Lookup
    else {
      const rulesRows = await getRows('Bot_Menus');
      let matchedRule = null;

      for (const r of rulesRows) {
        const keywords = (r[0] || '').split(',').map(k => k.trim().toUpperCase());
        if (keywords.includes(inputRaw)) {
          matchedRule = { replyText: r[1], nextStep: r[2], optionsJson: r[3] };
          break;
        }
      }

      if (matchedRule) {
        replyText = matchedRule.replyText;
        if (matchedRule.optionsJson && matchedRule.optionsJson.trim()) {
          replyText += "\n\n*Pilihan Menu:*\n" + matchedRule.optionsJson;
        }
        await updateContact(jid, { step: matchedRule.nextStep || 'MAIN_MENU' });
      } else {
        replyText = "Selamat datang di *Hanifa Laundry*! 🧺✨\n\nSilakan pilih menu:\n1. Cuci Pakaian (Kiloan)\n2. Cuci Sepatu/Helm/Tas\n3. Daftar Harga\n4. Lokasi Workshop\n5. Bicara CS Admin";
        await updateContact(jid, { step: 'MAIN_MENU' });
      }
    }

    await sendWASafely(waSock, jid, replyText);
    await appendRow('Messages', [jid, 'bot', replyText, new Date().toISOString()]);
  }
}

module.exports = { processIncomingMessage, sendWASafely };
