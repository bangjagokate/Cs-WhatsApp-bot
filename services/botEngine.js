const { getContacts, getBotRules, saveOrUpdateContact, saveMessage } = require('../config/database');

async function processBotLogic(jid, text, pushName) {
  const contacts = await getContacts();
  let contact = contacts.find(c => c.jid === jid);

  if (!contact) {
    contact = { jid, name: pushName, mode: 'bot', step: 'MAIN_MENU', tempName: '', tempWeight: '', tempAddress: '' };
    await saveOrUpdateContact(jid, contact);
  }

  await saveMessage(jid, 'user', text);

  // Trigger CS Human
  if (['cs', 'bantuan', 'admin'].includes(text.toLowerCase())) {
    await saveOrUpdateContact(jid, { mode: 'human', step: 'HUMAN' });
    const reply = "Permintaan diterima! Anda sekarang terhubung dengan Customer Service (Human). Sampaikan kendala Anda.";
    await saveMessage(jid, 'bot', reply);
    return reply;
  }

  if (contact.mode === 'bot') {
    const inputRaw = text.toUpperCase().trim();
    let replyText = "";

    if (['0', 'BATAL', 'KEMBALI'].includes(inputRaw)) {
      await saveOrUpdateContact(jid, { step: 'MAIN_MENU', tempName: '', tempWeight: '', tempAddress: '' });
      replyText = "Kembali ke Menu Utama.\n\n1. Cuci Pakaian (Kiloan)\n2. Cuci Sepatu/Helm/Tas\n3. Daftar Harga\n4. Lokasi Workshop\n5. Bicara CS Admin";
      await saveMessage(jid, 'bot', replyText);
      return replyText;
    }

    // Step 1: Input Nama
    if (contact.step === 'STEP_NAME_REGULAR' || contact.step === 'STEP_NAME_EXPRESS') {
      const isExp = contact.step === 'STEP_NAME_EXPRESS';
      const nextStep = isExp ? 'STEP_WEIGHT_EXPRESS' : 'STEP_WEIGHT_REGULAR';
      await saveOrUpdateContact(jid, { step: nextStep, tempName: text });
      replyText = `Terima kasih Sdr/i *${text}*.\n\nLangkah 2/3: Silakan masukkan *Estimasi Perkiraan Berat Pakaian (kg)*:\n(Contoh: 5 kg)`;
    }
    // Step 2: Input Berat
    else if (contact.step === 'STEP_WEIGHT_REGULAR' || contact.step === 'STEP_WEIGHT_EXPRESS') {
      const isExp = contact.step === 'STEP_WEIGHT_EXPRESS';
      const nextStep = isExp ? 'STEP_ADDRESS_EXPRESS' : 'STEP_ADDRESS_REGULAR';
      await saveOrUpdateContact(jid, { step: nextStep, tempWeight: text });
      replyText = `Perkiraan berat *${text}* dicatat.\n\nLangkah 3/3: Silakan masukkan *Alamat Lengkap Pickup / Penjemputan* Anda:`;
    }
    // Step 3: Input Alamat & Rangkuman Data
    else if (contact.step === 'STEP_ADDRESS_REGULAR' || contact.step === 'STEP_ADDRESS_EXPRESS') {
      const isExp = contact.step === 'STEP_ADDRESS_EXPRESS';
      await saveOrUpdateContact(jid, { step: 'CONFIRM_ORDER', tempAddress: text });

      const serviceName = isExp ? "Cuci Pakaian Express (1 Hari)" : "Cuci Pakaian Regular (3 Hari)";
      const serviceRate = isExp ? "Rp 10.000 / kg" : "Rp 6.000 / kg";

      replyText = `📋 *KOREKSI & KONFIRMASI DATA PESANAN*\n----------------------------------------\n• Layanan: ${serviceName}\n• Tarif: ${serviceRate}\n• Atas Nama: ${contact.tempName || pushName}\n• Perkiraan Berat: ${contact.tempWeight || '-'}\n• Alamat Pickup: ${text}\n----------------------------------------\nMohon periksa data di atas. Apakah data sudah benar dan Anda setuju untuk dijemput?\n\nKetik *SETUJU* untuk konfirmasi penjemputan.\nKetik *0* untuk membatalkan.`;
    }
    // Step 4: Final Settlement / SETUJU
    else if (contact.step === 'CONFIRM_ORDER' && (inputRaw === 'SETUJU' || inputRaw.includes('SETUJU'))) {
      await saveOrUpdateContact(jid, { mode: 'human', step: 'HUMAN' });
      replyText = "✅ *PESANAN BERHASIL DICATAT & KOREKSI SETUJU!*\n\nTerima kasih! Rangkuman data Anda telah masuk ke sistem Hanifa Laundry. Kurir kami akan segera menuju lokasi Anda.\n\nLayanan beralih ke Admin CS (Human).";
      await saveMessage(jid, 'bot', replyText);
      return replyText;
    }
    // Dynamic Rules Database Lookup
    else {
      const rules = await getBotRules();
      let matchedRule = null;

      for (const r of rules) {
        const keywords = (r.keyword || '').split(',').map(k => k.trim().toUpperCase());
        if (keywords.includes(inputRaw)) {
          matchedRule = r;
          break;
        }
      }

      if (matchedRule) {
        replyText = matchedRule.replyText;
        if (matchedRule.optionsJson && matchedRule.optionsJson.trim()) {
          replyText += "\n\n*Pilihan Menu:*\n" + matchedRule.optionsJson;
        }
        await saveOrUpdateContact(jid, { step: matchedRule.nextStep || 'MAIN_MENU' });
      } else {
        replyText = "Selamat datang di *Hanifa Laundry*! 🧺✨\n\nSilakan pilih menu:\n1. Cuci Pakaian (Kiloan)\n2. Cuci Sepatu/Helm/Tas\n3. Daftar Harga\n4. Lokasi Workshop\n5. Bicara CS Admin";
        await saveOrUpdateContact(jid, { step: 'MAIN_MENU' });
      }
    }

    await saveMessage(jid, 'bot', replyText);
    return replyText;
  }
}

module.exports = { processBotLogic };
