const DEFAULT_TRANSPORT = 'ctp';
const DEFAULT_PORTS = Object.freeze({
  ctp: 41795,
  ssh: 22,
});

function normalizeTransport(value) {
  const transport = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return transport === 'ssh' ? 'ssh' : DEFAULT_TRANSPORT;
}

function defaultPortForTransport(transport) {
  return DEFAULT_PORTS[normalizeTransport(transport)] || DEFAULT_PORTS[DEFAULT_TRANSPORT];
}

function parsePort(value, transport, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) {
    return parsed;
  }

  if (Number.isInteger(fallback) && fallback > 0 && fallback <= 65535) {
    return fallback;
  }

  return defaultPortForTransport(transport);
}

function normalizeConnectionConfig(input = {}, fallback = {}) {
  const fallbackTransport = normalizeTransport(fallback.transport);
  const transport = normalizeTransport(input.transport ?? fallback.transport);
  const fallbackPort = transport === fallbackTransport ? fallback.port : null;
  const hostSource = input.host ?? fallback.host;
  const usernameSource = transport === 'ssh' ? (input.username ?? fallback.username) : '';
  const passwordSource = transport === 'ssh'
    ? (Object.prototype.hasOwnProperty.call(input, 'password') ? input.password : fallback.password)
    : '';

  return {
    host: typeof hostSource === 'string' ? hostSource.trim() : '',
    port: parsePort(input.port, transport, fallbackPort),
    transport,
    username: typeof usernameSource === 'string' ? usernameSource.trim() : '',
    password: passwordSource == null ? '' : String(passwordSource),
  };
}

module.exports = {
  DEFAULT_TRANSPORT,
  DEFAULT_PORTS,
  defaultPortForTransport,
  normalizeConnectionConfig,
  normalizeTransport,
};
