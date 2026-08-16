let currentJid = null;

const contactList = document.getElementById('contactList');
const messageList = document.getElementById('messageList');
const activeChatName = document.getElementById('activeChatName');
const activeJid = document.getElementById('activeJid');
const modeToggle = document.getElementById('modeToggle');
const enableNotifBtn = document.getElementById('enableNotifBtn');

enableNotifBtn?.addEventListener('click', () => {
  if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
      if (permission === "granted") {
        alert("Notifikasi OS Browser Aktif!");
      }
    });
  }
});

// Self Keep-Alive Client Ping Loop
setInterval(async () => {
  try {
    await fetch('/api/ping');
  } catch(e){}
}, 60000);

async function loadContacts() {
  try {
    const res = await fetch('/api/contacts');
    const contacts = await res.json();
    contactList.innerHTML = contacts.map(c => `
      <div onclick="openChat('${c.jid}', '${escapeHtml(c.name)}', '${c.mode}')" class="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition ${currentJid === c.jid ? 'bg-slate-800 border-l-4 border-emerald-500' : ''}">
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
  activeChatName.textContent = name;
  activeJid.textContent = jid.split('@')[0];
  modeToggle.value = mode;

  const res = await fetch(`/api/messages/${jid}`);
  const msgs = await res.json();
  messageList.innerHTML = msgs.map(m => `
    <div class="flex ${m.sender_type === 'user' ? 'justify-start' : 'justify-end'}">
      <div class="max-w-[75%] p-3 rounded-2xl text-xs ${m.sender_type === 'user' ? 'bg-slate-900 text-slate-100 border border-slate-800' : 'bg-emerald-950 text-emerald-100 border border-emerald-800/40'}">
        <div class="text-[9px] font-bold uppercase mb-1 ${m.sender_type === 'user' ? 'text-slate-400' : 'text-emerald-400'}">${m.sender_type}</div>
        <div class="whitespace-pre-wrap">${escapeHtml(m.text)}</div>
      </div>
    </div>
  `).join('');
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

function escapeHtml(str) { return str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''; }

loadContacts();
setInterval(loadContacts, 8000);
