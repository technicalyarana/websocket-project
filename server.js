const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
app.use(express.json());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for device states
const deviceStates = {};
const deviceClients = new Map(); // deviceId -> WebSocket
const controllerClients = new Map(); // WebSocket -> { deviceId }

// Function to set relay state and notify clients
function setRelayState(deviceId, relayNum, state) {
  if (!deviceStates[deviceId]) {
    deviceStates[deviceId] = {};
  }
  deviceStates[deviceId][relayNum] = state;
  if (deviceClients.has(deviceId)) {
    deviceClients.get(deviceId).send(JSON.stringify({ type: 'set', relayNum, state }));
  }
  for (const [client, info] of controllerClients) {
    if (client.readyState === WebSocket.OPEN && info.deviceId === deviceId) {
      client.send(JSON.stringify({ type: 'state', deviceId, relayNum, state }));
    }
  }
}

// Function to add a new relay to a device
function addRelay(deviceId) {
  if (!deviceStates[deviceId]) {
    deviceStates[deviceId] = {};
  }
  const currentRelays = Object.keys(deviceStates[deviceId]).length;
  const newRelayNum = currentRelays + 1;
  deviceStates[deviceId][newRelayNum] = 'OFF';
  for (const [client, info] of controllerClients) {
    if (client.readyState === WebSocket.OPEN && info.deviceId === deviceId) {
      client.send(JSON.stringify({ type: 'fullState', states: { [deviceId]: deviceStates[deviceId] } }));
    }
  }
  if (deviceClients.has(deviceId)) {
    deviceClients.get(deviceId).send(JSON.stringify({ type: 'init', states: deviceStates[deviceId] }));
  }
  return true;
}

// REST API to turn relay ON
app.get('/device/:deviceId/relay/:relayNum/on', (req, res) => {
  const { deviceId, relayNum } = req.params;
  setRelayState(deviceId, relayNum, 'ON');
  res.json({ success: true, message: `Device ${deviceId} relay ${relayNum} is ON` });
});

// REST API to turn relay OFF
app.get('/device/:deviceId/relay/:relayNum/off', (req, res) => {
  const { deviceId, relayNum } = req.params;
  setRelayState(deviceId, relayNum, 'OFF');
  res.json({ success: true, message: `Device ${deviceId} relay ${relayNum} is OFF` });
});

// REST API to set relay state via POST
app.post('/api/device/:deviceId/relay/:relayNum', (req, res) => {
  const { deviceId, relayNum } = req.params;
  const { state } = req.body;
  if (state !== 'ON' && state !== 'OFF') {
    return res.status(400).json({ success: false, message: 'Invalid state' });
  }
  setRelayState(deviceId, relayNum, state);
  res.json({ success: true, message: `Device ${deviceId} relay ${relayNum} set to ${state}` });
});

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  console.log('WebSocket: New connection established');
  ws.type = null;

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (ws.type === null) {
        if (data.type === 'device' && data.deviceId) {
          ws.type = 'device';
          ws.deviceId = data.deviceId;
          if (deviceClients.has(data.deviceId)) {
            deviceClients.get(data.deviceId).close();
          }
          deviceClients.set(data.deviceId, ws);
          if (!deviceStates[data.deviceId]) {
            deviceStates[data.deviceId] = {};
          }
          ws.send(JSON.stringify({ type: 'init', states: deviceStates[data.deviceId] }));
        } else if (data.type === 'controller' && data.deviceId) {
          ws.type = 'controller';
          controllerClients.set(ws, { deviceId: data.deviceId });
          if (!deviceStates[data.deviceId]) {
            deviceStates[data.deviceId] = {};
          }
          const state = deviceStates[data.deviceId];
          ws.send(JSON.stringify({ type: 'fullState', states: { [data.deviceId]: state } }));
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid identification' }));
          ws.close();
        }
      } else if (ws.type === 'controller') {
        if (data.type === 'set' && data.deviceId && data.relayNum && (data.state === 'ON' || data.state === 'OFF')) {
          setRelayState(data.deviceId, data.relayNum, data.state);
        } else if (data.type === 'addRelay' && data.deviceId) {
          addRelay(data.deviceId);
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid command' }));
        }
      } else if (ws.type === 'device') {
        console.log(`Received message from device ${ws.deviceId}: ${message}`);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket: Connection closed');
    if (ws.type === 'device') {
      deviceClients.delete(ws.deviceId);
    } else if (ws.type === 'controller') {
      controllerClients.delete(ws);
    }
  });
});

// Start HTTP Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`HTTP server running at: https://websocket-project-sf6n.onrender.com`);
});

// Handle WebSocket upgrades
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});
