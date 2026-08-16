let qrCodeInstance = null;

function openQrModal() { document.getElementById('qrModal').classList.remove('hidden'); }
function closeQrModal() { document.getElementById('qrModal').classList.add('hidden'); }

async function syncQrCodeStatus() {
  try {
    const res = await fetch('/api/qr-status');
    const data = await res.json();

    const qrDiv = document.getElementById('qrcode');
    const qrLoader = document.getElementById('qrLoader');
    const qrConnectedCheck = document.getElementById('qrConnectedCheck');
    const qrDeviceStatusText = document.getElementById('qrDeviceStatusText');

    if (data.status === 'CONNECTED') {
      qrDiv.innerHTML = '';
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.remove('hidden');
      qrDeviceStatusText.textContent = "Status: WhatsApp Terhubung & Aktif!";
    } else if (data.rawQr && data.rawQr.length > 10) {
      qrLoader.classList.add('hidden');
      qrConnectedCheck.classList.add('hidden');
      
      // Render Client-Side QR Code Canvas
      qrDiv.innerHTML = '';
      new QRCode(qrDiv, {
        text: data.rawQr,
        width: 180,
        height: 180
      });
      
      qrDeviceStatusText.textContent = "Status: Siap Scan!";
    } else {
      qrLoader.classList.remove('hidden');
      qrConnectedCheck.classList.add('hidden');
      qrDiv.innerHTML = '';
      qrDeviceStatusText.textContent = "Menunggu Worker Termux...";
    }
  } catch(e) {}
}

setInterval(syncQrCodeStatus, 3000);
syncQrCodeStatus();
