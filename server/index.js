require('dotenv').config();

const http = require('http');
const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');

const CTPConnection = require('./ctp/connection');
const CommandQueue = require('./ctp/command-queue');
const WSHandler = require('./ws/handler');
const createRoutingRouter = require('./routes/routing');
const createStatusRouter = require('./routes/status');
const createSystemRouter = require('./routes/system');
const createNetworkRouter = require('./routes/network');

const DEFAULT_SWITCHER_PORT = 41795;
const DEFAULT_SERVER_PORT = 3000;

function parsePort(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const SWITCHER_HOST = (process.env.SWITCHER_HOST || '').trim();
const SWITCHER_PORT = parsePort(process.env.SWITCHER_PORT, DEFAULT_SWITCHER_PORT);
const SERVER_PORT = parsePort(process.env.SERVER_PORT, DEFAULT_SERVER_PORT);

// --- CTP Connection ---
const ctp = new CTPConnection(SWITCHER_HOST, SWITCHER_PORT);
const commandQueue = new CommandQueue(ctp);

ctp.on('connected', () => {
  console.log(`[Server] CTP connected to ${ctp.host}:${ctp.port}`);
});

ctp.on('disconnected', () => {
  console.log('[Server] CTP disconnected');
});

if (ctp.isConfigured) {
  ctp.connect();
}

// --- Express ---
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

// API routes
app.use('/api', createRoutingRouter(commandQueue));
app.use('/api', createStatusRouter(commandQueue));
app.use('/api', createSystemRouter(commandQueue));
app.use('/api', createNetworkRouter(commandQueue));

// Connection status endpoint
app.get('/api/connection', (req, res) => {
  res.json({
    connected: ctp.connected,
    configured: ctp.isConfigured,
    host: ctp.host || '',
    port: ctp.port,
    prompt: ctp.promptPattern
  });
});

// Connect to a different switcher
app.post('/api/connection', (req, res) => {
  const host = String(req.body?.host || '').trim();
  if (!host) return res.status(400).json({ error: 'host required' });

  const p = parsePort(req.body?.port, DEFAULT_SWITCHER_PORT);
  console.log(`[Server] Reconnecting to ${host}:${p}`);
  ctp.reconnectTo(host, p);
  res.json({ success: true, configured: true, host, port: p });
});

// Raw command endpoint (for any CTP command)
app.post('/api/command', async (req, res) => {
  const { command, timeout } = req.body;
  if (!command) return res.status(400).json({ error: 'command required' });
  try {
    const raw = await commandQueue.execute(command, timeout || 10000);
    res.json({ raw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- HTTP + WebSocket Server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsHandler = new WSHandler(wss, ctp, commandQueue);

server.listen(SERVER_PORT, () => {
  const address = server.address();
  const listenPort = typeof address === 'object' && address ? address.port : SERVER_PORT;

  console.log(`[Server] GUI running at http://localhost:${listenPort}`);
  if (ctp.isConfigured) {
    console.log(`[Server] Attempting connection to ${ctp.host}:${ctp.port}`);
  } else {
    console.log('[Server] No switcher configured. Set SWITCHER_HOST or use the Connect button in the UI.');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  ctp.destroy();
  server.close();
  process.exit(0);
});
