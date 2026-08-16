const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { getAllRecords } = require('../config/database');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/qr-status', async (req, res) => {
  try {
    const records = await getAllRecords();
    const qrRecords = records.filter(r => r && r.type === 'system_qr');

    if (qrRecords.length > 0) {
      const latest = qrRecords[qrRecords.length - 1];
      return res.json({
        status: latest.status || 'DISCONNECTED',
        rawQr: latest.rawQr || ''
      });
    }
    return res.json({ status: 'DISCONNECTED', rawQr: '' });
  } catch (err) {
    res.status(500).json({ status: 'ERROR', message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT);

module.exports = app;
