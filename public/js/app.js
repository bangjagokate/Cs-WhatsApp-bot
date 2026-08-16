let currentJid = null;

const contactList = document.getElementById('contactList');
const messageList = document.getElementById('messageList');
const activeChatName = document.getElementById('activeChatName');
const activeJid = document.getElementById('activeJid');
const avatarLetter = document.getElementById('avatarLetter');
const modeToggle = document.getElementById('modeToggle');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');
const emptyChatPlaceholder = document.getElementById('emptyChatPlaceholder');

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

  msgInput.value = '';
  await fetch('/api/webhook/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jid: currentJid, text })
  });

  openChat(currentJid, activeChatName.textContent, modeToggle.value);
}

function escapeHtml(str) { return str ? str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m])) : ''; }

loadContacts();
setInterval(loadContacts, 4000);
