let currentJid = null;

// UI Elements
const contactList = document.getElementById('contactList');
const messageList = document.getElementById('messageList');
const qrImage = document.getElementById('qrImage');
const qrLoader = document.getElementById('qrLoader');
const qrConnectedCheck = document.getElementById('qrConnectedCheck');
const qrDeviceStatusText = document.getElementById('qrDeviceStatusText');
const statusBadgeText = document.getElementById('statusBadgeText');

// Realtime QR Sync Engine
async function syncQrCodeStatus() {
  try {
    const res = await fetch('/api/qr-status');
    const data = await res.json();
    console.log("DEBUG API QR:", data); // Lihat ini di Console Browser

    if (data.status === 'CONNECTED') {
      qrImage.classList.add('hidden');
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.remove('hidden');
      qrDeviceStatusText.textContent = "Status: WA Terhubung & Aktif!";
      statusBadgeText.textContent = "WA Connected";
    } else if (data.qrDataUrl && data.qrDataUrl.startsWith('data:image')) {
      qrImage.src = data.qrDataUrl;
      qrImage.classList.remove('hidden');
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.add('hidden');
      qrDeviceStatusText.textContent = "Status: Scan QR Sekarang!";
      statusBadgeText.textContent = "Scan QR WA";
    } else {
      qrLoader.classList.remove('hidden');
      qrImage.classList.add('hidden');
      qrDeviceStatusText.textContent = "Menunggu Engine WA (Worker)...";
    }
  } catch(e) {
    console.error("Sync Error:", e);
  }
}

// Load Contacts
async function loadContacts() {
  try {
    const res = await fetch('/api/contacts');
    const contacts = await res.json();
    contactList.innerHTML = contacts.map(c => `
      <div onclick="openChat('${c.jid}', '${escapeHtml(c.name)}', '${c.mode}')" class="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center border-b border-slate-800">
        <div>
          <span class="font-semibold text-xs text-slate-200 block">${escapeHtml(c.name)}</span>
          <span class="text-[10px] text-slate-400 font-mono">${c.jid.split('@')[0]}</span>
        </div>
        <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${c.mode === 'bot' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}">${c.mode}</span>
      </div>
    `).join('');
  } catch(e){}
}

// Open Chat
async function openChat(jid, name, mode) {
  currentJid = jid;
  document.getElementById('activeChatName').textContent = name;
  document.getElementById('activeJid').textContent = jid.split('@')[0];
  document.getElementById('modeToggle').value = mode;
  document.getElementById('emptyChatPlaceholder')?.classList.add('hidden');

  const res = await fetch(`/api/messages/${jid}`);
  const msgs = await res.json();
  messageList.innerHTML = msgs.map(m => `
    <div class="flex ${m.senderType === 'user' ? 'justify-start' : 'justify-end'}">
      <div class="max-w-[75%] p-3 rounded-2xl text-xs ${m.senderType === 'user' ? 'bg-slate-900 text-slate-100' : 'bg-emerald-950 text-emerald-100'}">
        <div class="text-[9px] font-bold uppercase mb-1 ${m.senderType === 'user' ? 'text-slate-400' : 'text-emerald-400'}">${m.senderType}</div>
        <div class="whitespace-pre-wrap">${escapeHtml(m.text)}</div>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) { return str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''; }

// Initialize
loadContacts();
syncQrCodeStatus();
setInterval(syncQrCodeStatus, 3000);
setInterval(loadContacts, 8000);
