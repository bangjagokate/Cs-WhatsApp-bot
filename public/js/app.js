async function syncQrCodeStatus() {
  try {
    const res = await fetch('/api/qr-status');
    const data = await res.json();

    const qrImage = document.getElementById('qrImage');
    const qrLoader = document.getElementById('qrLoader');
    const qrConnectedCheck = document.getElementById('qrConnectedCheck');
    const qrDeviceStatusText = document.getElementById('qrDeviceStatusText');
    const statusBadge = document.getElementById('statusBadge');
    const statusBadgeText = document.getElementById('statusBadgeText');

    if (data.status === 'CONNECTED') {
      qrImage.classList.add('hidden');
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.remove('hidden');
      qrDeviceStatusText.textContent = "Status: WhatsApp Terhubung & Aktif 24/7";
      qrDeviceStatusText.className = "text-xs font-semibold text-emerald-400";

      statusBadge.className = "px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg";
      statusBadgeText.textContent = "WA Connected";
    } else if (data.qrDataUrl && data.qrDataUrl.length > 50) {
      // Tampilkan Gambar QR secara Instan
      qrImage.src = data.qrDataUrl;
      qrImage.classList.remove('hidden');
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.add('hidden');
      qrDeviceStatusText.textContent = "Status: Siap Scan! Buka WA di HP Anda";
      qrDeviceStatusText.className = "text-xs font-semibold text-amber-400";

      statusBadge.className = "px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg";
      statusBadgeText.textContent = "Scan QR WA";
    } else {
      qrImage.classList.add('hidden');
      qrConnectedCheck.classList.add('hidden');
      qrLoader.classList.remove('hidden');
      qrDeviceStatusText.textContent = "Menghubungkan ke Engine WA...";
      qrDeviceStatusText.className = "text-xs font-semibold text-slate-400";
    }
  } catch(e){}
}
