const express = require('express');
const axios = require('axios');
const path = require('path');
const WebSocket = require('ws');

const app = express();
app.use(express.json());

// ---------------------------
// (A) Static Files
// ---------------------------
/**
 * Static Files को Serve करें
 * public फोल्डर में index.html, CSS, JS रखे जाएं
 */
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------
// (B) REST API Routes
// ---------------------------
/**
 * REST API के लिए रूट्स
 * /pin2/on और /pin2/off GPIO को कंट्रोल करने के लिए
 */
app.get('/pin2/on', (req, res) => {
  console.log('Pin #2: ON (called /pin2/on)');
  return res.json({ success: true, message: 'Pin #2 is ON' });
});

app.get('/pin2/off', (req, res) => {
  console.log('Pin #2: OFF (called /pin2/off)');
  return res.json({ success: true, message: 'Pin #2 is OFF' });
});

/**
 * POST /api/pin2
 * यह रूट "state" लेता है और उसी डोमेन पर GET /pin2/on या /pin2/off कॉल करता है।
 */
app.post('/api/pin2', async (req, res) => {
  try {
    const { state } = req.body; // "ON" या "OFF"
    if (!state || (state !== 'ON' && state !== 'OFF')) {
      return res.status(400).json({ success: false, message: 'Invalid state!' });
    }

    const DOMAIN_URL = 'https://websocket-project-sf6n.onrender.com';

    // सही रूट को कॉल करें
    const endpoint = state === 'ON' ? `${DOMAIN_URL}/pin2/on` : `${DOMAIN_URL}/pin2/off`;
    await axios.get(endpoint);

    console.log(`Pin #2 state set to: ${state}`);
    return res.json({ success: true, message: `Pin #2 set to ${state}` });
  } catch (error) {
    console.error('Error in toggling pin:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ---------------------------
// (C) Health Check Route
// ---------------------------
/**
 * हेल्थ चेक रूट, यह पुष्टि करने के लिए कि सर्वर चल रहा है
 */
app.get('/', (req, res) => {
  res.send('Hello! This server supports both WebSocket and REST APIs.');
});

// ---------------------------
// (D) WebSocket Server
// ---------------------------
/**
 * WebSocket Server Setup
 */
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  console.log('WebSocket: New connection established');

  // Client को Welcome Message भेजें
  ws.send('WebSocket: Welcome to the server!');

  // Client से Message प्राप्त करें
  ws.on('message', (message) => {
    console.log(`WebSocket: Message received - ${message}`);

    if (message === 'ON') {
      console.log('WebSocket: Pin #2 ON');
      ws.send('Pin #2 is ON');
    } else if (message === 'OFF') {
      console.log('WebSocket: Pin #2 OFF');
      ws.send('Pin #2 is OFF');
    } else {
      console.log('WebSocket: Unknown command received');
      ws.send('Unknown command');
    }
  });

  // WebSocket Connection Close Event
  ws.on('close', () => {
    console.log('WebSocket: Connection closed');
  });
});

// WebSocket Upgrade Handler
app.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

// ---------------------------
// (E) Start the Server
// ---------------------------
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`HTTP and WebSocket server running at: https://websocket-project-sf6n.onrender.com`);
});

server.on('error', (err) => {
  console.error('Server Error:', err);
});
