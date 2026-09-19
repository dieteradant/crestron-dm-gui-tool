require('dotenv').config();

const http = require('http');
const { WebSocketServer } = require('ws');

const SwitcherConnection = require('./ctp/connection');
const { normalizeConnectionConfig } = require('./ctp/connection-config');
const CommandQueue = require('./ctp/command-queue');
const DeviceCapabilitiesService = require('./ctp/device-capabilities');
const WSHandler = require('./ws/handler');
const createApp = require('./app');

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

// --- HTTP + WebSocket Server ---
const app = createApp({
  connection: switcherConnection,
  commandQueue,
  deviceCapabilities,
});
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
new WSHandler(wss, switcherConnection, commandQueue);

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
