let currentJid = null;

const contactList = document.getElementById('contactList');
const messageList = document.getElementById('messageList');
const activeChatName = document.getElementById('activeChatName');
const activeJid = document.getElementById('activeJid');
const avatarLetter = document.getElementById('avatarLetter');
const modeToggle = document.getElementById('modeToggle');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const enableNotifBtn = document.getElementById('enableNotifBtn');
const emptyChatPlaceholder = document.getElementById('emptyChatPlaceholder');

// QR Modal Elements
const qrModal = document.getElementById('qrModal');
const qrImage = document.getElementById('qrImage');
const qrLoader = document.getElementById('qrLoader');
const qrConnectedCheck = document.getElementById('qrConnectedCheck');
const qrDeviceStatusText = document.getElementById('qrDeviceStatusText');
const statusBadge = document.getElementById('statusBadge');
const statusBadgeText = document.getElementById('statusBadgeText');

function openQrModal() { qrModal.classList.remove('hidden'); }
function closeQrModal() { qrModal.classList.add('hidden'); }

enableNotifBtn?.addEventListener('click', () => {
  if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") alert("Notifikasi Browser Berhasil Diaktifkan!");
    });
  }
});

// Polling Engine QR Code dari Server Endpoint Vercel
async function syncQrCodeStatus() {
  try {
    const res = await fetch('/api/qr-status');
    const data = await res.json();

    if (data.status === 'CONNECTED') {
      qrImage.classList.add('hidden');
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.remove('hidden');
      qrDeviceStatusText.textContent = "Status: WhatsApp Terhubung & Aktif 24/7";
      qrDeviceStatusText.className = "text-xs font-semibold text-emerald-400";

      statusBadge.className = "px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg";
      statusBadgeText.textContent = "WA Connected";
    } else if (data.qrDataUrl) {
      qrImage.src = data.qrDataUrl;
      qrImage.classList.remove('hidden');
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.add('hidden');
      qrDeviceStatusText.textContent = "Status: Menunggu Scan QR Code...";
      qrDeviceStatusText.className = "text-xs font-semibold text-amber-400";

      statusBadge.className = "px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg";
      statusBadgeText.textContent = "Scan QR WA";
    }
  } catch(e){}
}

async function loadContacts() {
  try {
    const res = await fetch('/api/contacts');
    const contacts = await res.json();
    contactList.innerHTML = contacts.map(c => `
      <div onclick="openChat('${c.jid}', '${escapeHtml(c.name)}', '${c.mode}')" 
           class="p-3 hover:bg-slate-800/60 cursor-pointer flex justify-between items-center transition ${currentJid === c.jid ? 'bg-slate-800 border-l-4 border-emerald-500' : ''}">
        <div class="flex items-center space-x-2.5 overflow-hidden">
          <div class="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 font-bold text-xs shrink-0 border border-slate-700">
            ${escapeHtml(c.name).charAt(0).toUpperCase()}
          </div>
          <div class="truncate">
            <span class="font-semibold text-xs text-slate-200 block truncate">${escapeHtml(c.name)}</span>
            <span class="text-[10px] text-slate-400 font-mono">${c.jid.split('@')[0]}</span>
          </div>
        </div>
        <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase shrink-0 ${c.mode === 'bot' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}">
          ${c.mode}
        </span>
      </div>
    `).join('');
  } catch(e){}
}

async function openChat(jid, name, mode) {
  currentJid = jid;
  activeChatName.textContent = name;
  activeJid.textContent = jid.split('@')[0];
  avatarLetter.textContent = name.charAt(0).toUpperCase();
  modeToggle.value = mode;
  emptyChatPlaceholder?.classList.add('hidden');

  const res = await fetch(`/api/messages/${jid}`);
  const msgs = await res.json();
  messageList.innerHTML = msgs.map(m => `
    <div class="flex ${m.senderType === 'user' ? 'justify-start' : 'justify-end'}">
      <div class="max-w-[85%] sm:max-w-[70%] p-3 rounded-2xl shadow-lg text-xs ${m.senderType === 'user' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-emerald-950/70 text-emerald-100 border border-emerald-800/40'}">
        <div class="text-[9px] font-bold uppercase tracking-wider mb-1 ${m.senderType === 'user' ? 'text-slate-400' : 'text-emerald-400'}">${m.senderType}</div>
        <div class="whitespace-pre-wrap leading-relaxed">${escapeHtml(m.text)}</div>
      </div>
    </div>
  `).join('');
  messageList.scrollTop = messageList.scrollHeight;
}

modeToggle.addEventListener('change', async (e) => {
  if (!currentJid) return;
  await fetch('/api/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jid: currentJid, mode: e.target.value })
  });
  loadContacts();
});

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text || !currentJid) return;

  if (modeToggle.value === 'bot') {
    alert('Ubah status ke CS Admin (Human) untuk membalas manual!');
    return;
  }

  msgInput.value = '';
  await fetch('/api/webhook/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jid: currentJid, text, pushName: activeChatName.textContent })
  });

  openChat(currentJid, activeChatName.textContent, modeToggle.value);
}

function escapeHtml(str) { return str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''; }

// Init Run
loadContacts();
syncQrCodeStatus();
setInterval(loadContacts, 5000);
setInterval(syncQrCodeStatus, 3000);
