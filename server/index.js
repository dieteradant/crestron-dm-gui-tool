require('dotenv').config();

const http = require('http');
const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');

const SwitcherConnection = require('./ctp/connection');
const {
  defaultPortForTransport,
  normalizeConnectionConfig,
} = require('./ctp/connection-config');
const CommandQueue = require('./ctp/command-queue');
const DeviceCapabilitiesService = require('./ctp/device-capabilities');
const WSHandler = require('./ws/handler');
const connectionStatePayload = require('./connection-state');
const { httpError, asyncHandler, apiErrorMiddleware } = require('./http');
const createRoutingRouter = require('./routes/routing');
const createStatusRouter = require('./routes/status');
const createSystemRouter = require('./routes/system');
const createNetworkRouter = require('./routes/network');

const DEFAULT_SERVER_PORT = 3000;

function parsePort(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

const SERVER_PORT = parsePort(process.env.SERVER_PORT, DEFAULT_SERVER_PORT);
const initialConnectionConfig = normalizeConnectionConfig({
  host: process.env.SWITCHER_HOST,
  port: process.env.SWITCHER_PORT,
  transport: process.env.SWITCHER_TRANSPORT,
  username: process.env.SWITCHER_USERNAME,
  password: process.env.SWITCHER_PASSWORD,
});

// --- Switcher Connection ---
const switcherConnection = new SwitcherConnection(initialConnectionConfig);
const commandQueue = new CommandQueue(switcherConnection);
const deviceCapabilities = new DeviceCapabilitiesService(commandQueue, switcherConnection);

switcherConnection.on('connected', () => {
  console.log(`[Server] ${switcherConnection.transport.toUpperCase()} connected to ${switcherConnection.host}:${switcherConnection.port}`);
});

switcherConnection.on('disconnected', () => {
  console.log('[Server] Switcher disconnected');
});

if (switcherConnection.isConfigured) {
  switcherConnection.connect();
}

// --- Express ---
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'client')));

// API routes
app.use('/api', createRoutingRouter(commandQueue, deviceCapabilities));
app.use('/api', createStatusRouter(commandQueue, deviceCapabilities));
app.use('/api', createSystemRouter(commandQueue));
app.use('/api', createNetworkRouter(commandQueue));

app.get('/api/capabilities', asyncHandler(async (req, res) => {
  res.json(await deviceCapabilities.get());
}));

// Connection status endpoint
app.get('/api/connection', (req, res) => {
  res.json(connectionStatePayload(switcherConnection));
});

// Connect to a different switcher
app.post('/api/connection', asyncHandler(async (req, res) => {
  const connectionConfig = normalizeConnectionConfig(req.body || {}, {
    transport: switcherConnection.transport,
    port: switcherConnection.port,
    username: switcherConnection.username,
    password: switcherConnection.password,
  });

  if (!connectionConfig.host) {
    throw httpError(400, 'host required');
  }

  if (connectionConfig.transport === 'ssh' && !connectionConfig.username) {
    throw httpError(400, 'username required for SSH');
  }

  if (!connectionConfig.port) {
    connectionConfig.port = defaultPortForTransport(connectionConfig.transport);
  }

  console.log(`[Server] Reconnecting via ${connectionConfig.transport.toUpperCase()} to ${connectionConfig.host}:${connectionConfig.port}`);
  deviceCapabilities.invalidate();
  switcherConnection.reconnectTo(connectionConfig);
  res.json({
    success: true,
    configured: true,
    host: connectionConfig.host,
    port: connectionConfig.port,
    transport: connectionConfig.transport,
    username: connectionConfig.username || '',
    hasPassword: Boolean(connectionConfig.password),
  });
}));

// Raw command endpoint for the active console transport
app.post('/api/command', asyncHandler(async (req, res) => {
  const { command, timeout } = req.body;
  if (!command) throw httpError(400, 'command required');
  const raw = await commandQueue.execute(command, timeout || 10000);
  res.json({ raw });
}));

app.use(apiErrorMiddleware);

// --- HTTP + WebSocket Server ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const wsHandler = new WSHandler(wss, switcherConnection, commandQueue);

server.listen(SERVER_PORT, () => {
  const address = server.address();
  const listenPort = typeof address === 'object' && address ? address.port : SERVER_PORT;

  console.log(`[Server] GUI running at http://localhost:${listenPort}`);
  if (switcherConnection.isConfigured) {
    console.log(`[Server] Attempting ${switcherConnection.transport.toUpperCase()} connection to ${switcherConnection.host}:${switcherConnection.port}`);
  } else {
    console.log('[Server] No switcher configured. Set SWITCHER_HOST or use the Connect button in the UI.');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  switcherConnection.destroy();
  server.close();
  process.exit(0);
});
