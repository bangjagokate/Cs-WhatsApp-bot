let currentJid = null;
let lastRenderedQr = "";

const contactList = document.getElementById('contactList');
const messageList = document.getElementById('messageList');
const activeChatName = document.getElementById('activeChatName');
const activeJid = document.getElementById('activeJid');
const modeToggle = document.getElementById('modeToggle');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const emptyChatPlaceholder = document.getElementById('emptyChatPlaceholder');

const qrModal = document.getElementById('qrModal');
const qrcodeCanvas = document.getElementById('qrcodeCanvas');
const qrLoader = document.getElementById('qrLoader');
const qrConnectedCheck = document.getElementById('qrConnectedCheck');
const qrDeviceStatusText = document.getElementById('qrDeviceStatusText');
const statusBadge = document.getElementById('statusBadge');
const statusBadgeText = document.getElementById('statusBadgeText');

function openQrModal() { qrModal.classList.remove('hidden'); }
function closeQrModal() { qrModal.classList.add('hidden'); }

// Dynamic Client QR Code Renderer
async function syncQrCodeStatus() {
  try {
    const res = await fetch('/api/qr-status');
    const data = await res.json();

    if (data.status === 'CONNECTED') {
      qrcodeCanvas.innerHTML = '';
      lastRenderedQr = "";
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.remove('hidden');
      qrDeviceStatusText.textContent = "Status: WhatsApp Terhubung & Aktif 24/7";
      qrDeviceStatusText.className = "text-xs font-semibold text-emerald-400";

      if (statusBadgeText) statusBadgeText.textContent = "WA Connected";
      if (statusBadge) statusBadge.className = "px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg";
    } else if (data.qrDataUrl && data.qrDataUrl.length > 5) {
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.add('hidden');

      // Hindari re-render berlebihan jika QR belum berubah
      if (lastRenderedQr !== data.qrDataUrl) {
        lastRenderedQr = data.qrDataUrl;
        qrcodeCanvas.innerHTML = '';
        new QRCode(qrcodeCanvas, {
          text: data.qrDataUrl,
          width: 190,
          height: 190,
          colorDark: "#000000",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.L
        });
      }

      qrDeviceStatusText.textContent = "Status: Siap Scan! Buka WA di HP Anda";
      qrDeviceStatusText.className = "text-xs font-semibold text-amber-400";

      if (statusBadgeText) statusBadgeText.textContent = "Scan QR WA";
      if (statusBadge) statusBadge.className = "px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg";
    } else {
      qrcodeCanvas.innerHTML = '';
      lastRenderedQr = "";
      qrLoader.classList.remove('hidden');
      qrConnectedCheck.classList.add('hidden');
      qrDeviceStatusText.textContent = "Menunggu Engine WA (Worker Termux)...";
      qrDeviceStatusText.className = "text-xs font-semibold text-amber-500/80";
    }
  } catch(e) {
    console.error("Sync Error:", e);
  }
}

async function loadContacts() {
  try {
    const res = await fetch('/api/contacts');
    const contacts = await res.json();
    if (!Array.isArray(contacts)) return;

    contactList.innerHTML = contacts.map(c => `
      <div onclick="openChat('${c.jid}', '${escapeHtml(c.name)}', '${c.mode}')" class="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center border-b border-slate-800/60 transition ${currentJid === c.jid ? 'bg-slate-800 border-l-4 border-emerald-500' : ''}">
        <div>
          <span class="font-semibold text-xs text-slate-200 block truncate">${escapeHtml(c.name)}</span>
          <span class="text-[10px] text-slate-400 font-mono">${c.jid.split('@')[0]}</span>
        </div>
        <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${c.mode === 'bot' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}">${c.mode}</span>
      </div>
    `).join('');
  } catch(e){}
}

async function openChat(jid, name, mode) {
  currentJid = jid;
  document.getElementById('activeChatName').textContent = name;
  document.getElementById('activeJid').textContent = jid.split('@')[0];
  document.getElementById('modeToggle').value = mode;
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

function escapeHtml(str) { return str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''; }

// Ping Keep-Alive
setInterval(async () => { try { await fetch('/api/ping'); } catch(e){} }, 30000);

loadContacts();
syncQrCodeStatus();
setInterval(syncQrCodeStatus, 2500);
setInterval(loadContacts, 6000);
