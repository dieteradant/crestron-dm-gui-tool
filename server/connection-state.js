// Single source of truth for the connection state payload shared by the
// REST endpoint and the WebSocket handler.

function connectionStatePayload(connection) {
  return {
    connected: connection.connected,
    configured: connection.isConfigured,
    host: connection.host || '',
    port: connection.port,
    transport: connection.transport,
    username: connection.username || '',
    hasPassword: Boolean(connection.password),
    prompt: connection.promptPattern,
  };
}

module.exports = connectionStatePayload;
