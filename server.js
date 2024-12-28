// server.js
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(express.json());

// 1) अपनी public फोल्डर को सर्व करें (जहाँ index.html, CSS, JS रखेंगे)
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------
// (A) ROUTES FOR PIN ON/OFF
// ---------------------------
/**
 * /pin2/on  और /pin2/off  रूट्स
 * यहाँ आप असल में हार्डवेयर पिन कंट्रोल की लॉजिक लगा सकते हैं
 * फ़िलहाल ये सिर्फ़ "Pin #2 ON/OFF" का मैसेज रिटर्न करेंगे.
 */
app.get('/pin2/on', (req, res) => {
  console.log('Pin #2: ON (called /pin2/on)');
  // यहाँ अगर आप चाहें तो असली हार्डवेयर इंटरैक्शन कर सकते हैं
  return res.json({ success: true, message: 'Pin #2 is ON' });
});

app.get('/pin2/off', (req, res) => {
  console.log('Pin #2: OFF (called /pin2/off)');
  // यहाँ अगर आप चाहें तो असली हार्डवेयर इंटरैक्शन कर सकते हैं
  return res.json({ success: true, message: 'Pin #2 is OFF' });
});

// ---------------------------
// (B) MAIN API ENDPOINT
// ---------------------------
/**
 * /api/pin2
 * यह रूट POST रिक्वेस्ट लेता है ("state": "ON" या "OFF"),
 * और उसी डोमेन पर /pin2/on या /pin2/off को कॉल करता है.
 * यानी कोई लोकल IP नहीं, सिर्फ़ आपका Render डोमेन इस्तेमाल होगा.
 */
app.post('/api/pin2', async (req, res) => {
  try {
    const { state } = req.body; // state = "ON" या "OFF"
    if (!state) {
      return res.status(400).json({ success: false, message: "State is required!" });
    }

    // NOTE: HTTPS का प्रयोग कीजिए, क्योंकि Render पर आपका डोमेन HTTPS है
    const DOMAIN_URL = 'https://websocket-project-sf6n.onrender.com';

    // /pin2/on या /pin2/off में से किसे कॉल करना है?
    if (state === 'ON') {
      await axios.get(`${DOMAIN_URL}/pin2/on`);
    } else {
      await axios.get(`${DOMAIN_URL}/pin2/off`);
    }

    return res.json({ success: true, message: `Pin #2 set to ${state}` });
  } catch (error) {
    console.error('Error in toggling pin:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------
// (C) HEALTH CHECK OR ROOT
// ---------------------------
app.get('/', (req, res) => {
  res.send('Hello! This is your live server on Render, using only domain routes.');
});

// ---------------------------
// (D) START THE SERVER
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at: https://websocket-project-sf6n.onrender.com`);
});
