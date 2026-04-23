const EventEmitter = require('events');
const RawSocketTransport = require('./transports/raw-socket');
const SshShellTransport = require('./transports/ssh-shell');
const { normalizeConnectionConfig } = require('./connection-config');

const PROMPT_PATTERN = /^([A-Za-z0-9][A-Za-z0-9\-]+> ?)/m;
const TRANSPORTS = {
  ctp: RawSocketTransport,
  ssh: SshShellTransport,
};

class SwitcherConnection extends EventEmitter {
  constructor(hostOrConfig, port) {
    super();
    const config = typeof hostOrConfig === 'object'
      ? normalizeConnectionConfig(hostOrConfig)
      : normalizeConnectionConfig({ host: hostOrConfig, port });

    this.host = config.host;
    this.port = config.port;
    this.transport = config.transport;
    this.username = config.username;
    this.password = config.password;
    this.connected = false;
    this.promptPattern = null;
    this._reconnectDelay = 1000;
    this._reconnectTimer = null;
    this._shouldReconnect = true;
    this._buffer = '';
    this._transport = null;
  }

  get isConfigured() {
    if (!this.host) return false;
    if (this.transport === 'ssh') {
      return Boolean(this.username);
    }
    return true;
  }

  connect() {
    this._shouldReconnect = true;
    if (!this.isConfigured) return;
    this._createSocket();
  }

  reconnectTo(hostOrConfig, port) {
    const nextConfig = typeof hostOrConfig === 'object'
      ? normalizeConnectionConfig(hostOrConfig, this._currentConfig())
      : normalizeConnectionConfig({ host: hostOrConfig, port }, this._currentConfig());

    this.host = nextConfig.host;
    this.port = nextConfig.port;
    this.transport = nextConfig.transport;
    this.username = nextConfig.username;
    this.password = nextConfig.password;
    this.destroy();
    this.connect();
  }

  _createSocket() {
    if (!this.isConfigured) return;

    this._destroyTransport();
    this._buffer = '';
    this.promptPattern = null;

    const Transport = TRANSPORTS[this.transport] || RawSocketTransport;
    this._transport = new Transport(this._currentConfig());

    this._transport.on('ready', () => {
      console.log(`[Connection] ${this.transport.toUpperCase()} transport ready for ${this._displayTarget()}`);
      this._reconnectDelay = 1000;
    });

    this._transport.on('data', (text) => {
      this._buffer += text;

      if (!this.promptPattern) {
        const match = this._buffer.match(PROMPT_PATTERN);
        if (match) {
          this.promptPattern = match[1].trimEnd();
          console.log(`[Connection] Detected prompt: "${this.promptPattern}"`);
          if (!this.connected) {
            this.connected = true;
            this.emit('connected');
          }
        }
      }

      this.emit('data', text);

      if (this.promptPattern && this._buffer.includes(this.promptPattern)) {
        this.emit('prompt', this._buffer);
        this._buffer = '';
      }
    });

    this._transport.on('close', () => {
      const wasConnected = this.connected;
      this.connected = false;
      this.promptPattern = null;
      this._buffer = '';
      if (wasConnected) {
        console.log('[Connection] Connection closed');
        this.emit('disconnected');
      }
      this._scheduleReconnect();
    });

    this._transport.on('error', (err) => {
      console.error(`[Connection] ${this.transport.toUpperCase()} error: ${err.message}`);
    });

    this._transport.connect();
  }

  _scheduleReconnect() {
    if (!this._shouldReconnect) return;
    console.log(`[Connection] Reconnecting to ${this._displayTarget()} in ${this._reconnectDelay}ms...`);
    this._reconnectTimer = setTimeout(() => {
      this._createSocket();
    }, this._reconnectDelay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, 30000);
  }

  sendRaw(text) {
    this._transport?.sendRaw(text);
  }

  sendCommand(cmd) {
    this.sendRaw(cmd + '\r\n');
  }

  resetBuffer() {
    this._buffer = '';
  }

  destroy() {
    this._shouldReconnect = false;
    clearTimeout(this._reconnectTimer);
    this._destroyTransport();
    this.connected = false;
    this.promptPattern = null;
    this._buffer = '';
  }

  _destroyTransport() {
    if (!this._transport) return;
    this._transport.removeAllListeners();
    this._transport.destroy();
    this._transport = null;
  }

  _currentConfig() {
    return {
      host: this.host,
      port: this.port,
      transport: this.transport,
      username: this.username,
      password: this.password,
    };
  }

  _displayTarget() {
    if (this.transport === 'ssh') {
      return `${this.username}@${this.host}:${this.port}`;
    }

    return `${this.host}:${this.port}`;
  }
}

module.exports = SwitcherConnection;
