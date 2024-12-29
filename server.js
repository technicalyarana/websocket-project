

const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
app.use(express.json());

// ---------------------------
// (A) Static Files
// ---------------------------
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------
// (B) REST API Routes
// ---------------------------
let pinState = 'OFF'; // Global pin state
const clients = new Set(); // Track WebSocket clients

// Handle REST API routes
app.get('/pin2/on', (req, res) => {
  console.log('REST API: Pin #2 ON');
  pinState = 'ON';
  broadcastState(pinState);
  return res.json({ success: true, message: 'Pin #2 is ON' });
});

app.get('/pin2/off', (req, res) => {
  console.log('REST API: Pin #2 OFF');
  pinState = 'OFF';
  broadcastState(pinState);
  return res.json({ success: true, message: 'Pin #2 is OFF' });
});

app.post('/api/pin2', (req, res) => {
  const { state } = req.body;
  if (state === 'ON' || state === 'OFF') {
    console.log(`REST API: Pin #2 state set to ${state}`);
    pinState = state;
    broadcastState(pinState);
    return res.json({ success: true, message: `Pin #2 set to ${state}` });
  }
  return res.status(400).json({ success: false, message: 'Invalid state' });
});

// ---------------------------
// (C) WebSocket Server
// ---------------------------
const wss = new WebSocket.Server({ noServer: true });

function broadcastState(state) {
  console.log(`Broadcasting state: ${state}`);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(state);
    }
  }
}

wss.on('connection', (ws) => {
  console.log('WebSocket: New connection established');
  clients.add(ws);

  // Send current pin state to the newly connected client
  ws.send(pinState);

  ws.on('message', (message) => {
    const trimmedMessage = message.toString().trim();
    console.log(`WebSocket: Message received - "${trimmedMessage}"`);

    if (trimmedMessage === 'ON') {
      console.log('WebSocket: Pin #2 ON');
      pinState = 'ON';
      broadcastState(pinState);
    } else if (trimmedMessage === 'OFF') {
      console.log('WebSocket: Pin #2 OFF');
      pinState = 'OFF';
      broadcastState(pinState);
    } else {
      console.log('WebSocket: Unknown command received');
      ws.send('ERROR: Unknown command');
    }
  });

  ws.on('close', () => {
    console.log('WebSocket: Connection closed');
    clients.delete(ws);
  });
});

// ---------------------------
// (D) Live Server for HTTPS
// ---------------------------
const PORT = process.env.PORT || 3000;

// HTTP Server
const server = app.listen(PORT, () => {
  console.log(`HTTP server running at: https://websocket-project-sf6n.onrender.com`);
});

// WebSocket Upgrade for HTTPS
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});







// const express = require('express');
// const WebSocket = require('ws');
// const path = require('path');

// const app = express();
// app.use(express.json());

// // ---------------------------
// // (A) Static Files
// // ---------------------------
// app.use(express.static(path.join(__dirname, 'public')));

// // ---------------------------
// // (B) REST API Routes
// // ---------------------------
// let pinState = 'OFF'; // Track pin state globally
// const clients = new Set(); // Track WebSocket clients

// app.get('/pin2/on', (req, res) => {
//   console.log('REST API: Pin #2 ON');
//   pinState = 'ON';
//   broadcastState(pinState); // Broadcast to WebSocket clients
//   return res.json({ success: true, message: 'Pin #2 is ON' });
// });

// app.get('/pin2/off', (req, res) => {
//   console.log('REST API: Pin #2 OFF');
//   pinState = 'OFF';
//   broadcastState(pinState); // Broadcast to WebSocket clients
//   return res.json({ success: true, message: 'Pin #2 is OFF' });
// });

// app.post('/api/pin2', (req, res) => {
//   const { state } = req.body;
//   if (state === 'ON' || state === 'OFF') {
//     console.log(`REST API: Pin #2 state set to ${state}`);
//     pinState = state;
//     broadcastState(pinState); // Broadcast to WebSocket clients
//     return res.json({ success: true, message: `Pin #2 set to ${state}` });
//   }
//   return res.status(400).json({ success: false, message: 'Invalid state' });
// });

// // ---------------------------
// // (C) WebSocket Server
// // ---------------------------
// const wss = new WebSocket.Server({ port: 8080 });

// function broadcastState(state) {
//   console.log(`Broadcasting state: ${state}`);
//   for (const client of clients) {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(state);
//     }
//   }
// }

// wss.on('connection', (ws) => {
//   console.log('WebSocket: New connection established');
//   clients.add(ws);

//   // Send the current state to the newly connected client
//   ws.send(pinState);

//   ws.on('message', (message) => {
//     const trimmedMessage = message.toString().trim();
//     console.log(`Raw WebSocket message received: "${message}"`);
//     console.log(`Trimmed WebSocket message: "${trimmedMessage}"`);

//     if (trimmedMessage === 'ON') {
//       console.log('WebSocket: Pin #2 ON');
//       pinState = 'ON';
//       broadcastState(pinState);
//     } else if (trimmedMessage === 'OFF') {
//       console.log('WebSocket: Pin #2 OFF');
//       pinState = 'OFF';
//       broadcastState(pinState);
//     } else {
//       console.log('WebSocket: Unknown command received');
//       ws.send('ERROR');
//     }
//   });

//   ws.on('close', () => {
//     console.log('WebSocket: Connection closed');
//     clients.delete(ws);
//   });
// });

// // ---------------------------
// // (D) HTTP Server Setup
// // ---------------------------
// const PORT = 3000;
// app.listen(PORT, '192.168.31.230', () => {
//   console.log(`HTTP server running at: http://192.168.31.230:${PORT}`);
//   console.log(`WebSocket server running at: ws://192.168.31.230:8080`);
// });
