// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

// यहाँ सबसे IMPORTANT:
// ESP32_IP = '192.168.31.81'  (जो सीरियल मॉनिटर में दिखा)
const ESP32_IP = 'websocket-project-sf6n.onrender.com';

// JSON बॉडी पार्स
app.use(express.json());

// public फोल्डर में index.html वग़ैरह रखेंगे
app.use(express.static(path.join(__dirname, 'public')));

// API रूट (POST /api/pin2)
app.post('/api/pin2', async (req, res) => {
  try {
    const { state } = req.body; // "ON" या "OFF"
    
    if (state === 'ON') {
      await axios.get(`http://${ESP32_IP}/pin2/on`);
    } else {
      await axios.get(`http://${ESP32_IP}/pin2/off`);
    }

    res.json({ success: true, message: `Pin #2 set to ${state}` });
  } catch (error) {
    console.error('Error in toggling pin:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// सर्वर स्टार्ट: port 3000
const PORT = 3000;

// आप चाहें तो host '192.168.31.230' भी specify कर सकते हैं,
// पर ज्यादातर मामलों में '0.0.0.0' पर listen करने से भी काम चल जाता है.
app.listen(PORT, () => {
  console.log(`Node.js API server running at https://websocket-project-sf6n.onrender.com:${PORT}`);
});
