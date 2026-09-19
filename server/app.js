const express = require('express');
const path = require('path');

const { asyncHandler, apiErrorMiddleware, httpError } = require('./http');
const connectionStatePayload = require('./connection-state');
const { normalizeConnectionConfig } = require('./ctp/connection-config');
const createRoutingRouter = require('./routes/routing');
const createStatusRouter = require('./routes/status');
const createSystemRouter = require('./routes/system');
const createNetworkRouter = require('./routes/network');

// Builds the Express app from injected dependencies so the API can be
// exercised in tests with fake connection/queue/capabilities services.
function createApp({ connection, commandQueue, deviceCapabilities }) {
  const app = express();

  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'client')));

  app.use('/api', createRoutingRouter(commandQueue, deviceCapabilities));
  app.use('/api', createStatusRouter(commandQueue, deviceCapabilities));
  app.use('/api', createSystemRouter(commandQueue));
  app.use('/api', createNetworkRouter(commandQueue));

  app.get('/api/capabilities', asyncHandler(async (req, res) => {
    res.json(await deviceCapabilities.get());
  }));

  app.get('/api/connection', (req, res) => {
    res.json(connectionStatePayload(connection));
  });

  // Connect to a different switcher
  app.post('/api/connection', asyncHandler(async (req, res) => {
    const nextConfig = normalizeConnectionConfig(req.body || {}, {
      transport: connection.transport,
      port: connection.port,
      username: connection.username,
      password: connection.password,
    });

    if (!nextConfig.host) throw httpError(400, 'host required');
    if (nextConfig.transport === 'ssh' && !nextConfig.username) {
      throw httpError(400, 'username required for SSH');
    }

    console.log(`[Server] Reconnecting via ${nextConfig.transport.toUpperCase()} to ${nextConfig.host}:${nextConfig.port}`);
    deviceCapabilities.invalidate();
    connection.reconnectTo(nextConfig);
    res.json({
      success: true,
      configured: true,
      host: nextConfig.host,
      port: nextConfig.port,
      transport: nextConfig.transport,
      username: nextConfig.username || '',
      hasPassword: Boolean(nextConfig.password),
    });
  }));

  // Raw command endpoint for the active console transport
  app.post('/api/command', asyncHandler(async (req, res) => {
    const { command, timeout } = req.body || {};
    if (!command) throw httpError(400, 'command required');
    const parsedTimeout = Number(timeout) > 0 ? Number(timeout) : 10000;
    res.json(await commandQueue.executeDetailed(command, parsedTimeout));
  }));

  app.use(apiErrorMiddleware);
  return app;
}

module.exports = createApp;
