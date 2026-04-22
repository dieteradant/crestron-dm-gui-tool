const net = require('net');
const EventEmitter = require('events');

class CTPConnection extends EventEmitter {
  constructor(host, port) {
    super();
    this.host = typeof host === 'string' ? host.trim() : '';
    this.port = port;
    this.socket = null;
    this.connected = false;
    this.promptPattern = null;
    this._reconnectDelay = 1000;
    this._reconnectTimer = null;
    this._shouldReconnect = true;
    this._buffer = '';
  }

  get isConfigured() {
    return Boolean(this.host);
  }

  connect() {
    this._shouldReconnect = true;
    if (!this.isConfigured) return;
    this._createSocket();
  }

  reconnectTo(host, port) {
    this.host = typeof host === 'string' ? host.trim() : '';
    this.port = port;
    this.promptPattern = null;
    this.destroy();
    this.connect();
  }

  _createSocket() {
    if (!this.isConfigured) return;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
    }

    this.socket = new net.Socket();
    this._buffer = '';

    this.socket.connect(this.port, this.host, () => {
      console.log(`[CTP] TCP connected to ${this.host}:${this.port}`);
      this._reconnectDelay = 1000;
    });

    this.socket.on('data', (data) => {
      const text = data.toString();
      this._buffer += text;

      // Auto-detect prompt — matches e.g. "DM-MD8x8>" or "DM-MD16x16>"
      if (!this.promptPattern) {
        const match = this._buffer.match(/^([A-Za-z0-9][A-Za-z0-9\-]+>)/m);
        if (match) {
          this.promptPattern = match[1];
          console.log(`[CTP] Detected prompt: "${this.promptPattern}"`);
          if (!this.connected) {
            this.connected = true;
            this.emit('connected');
          }
        }
      }

      this.emit('data', text);

      // Check if buffer ends with the prompt (for command queue)
      if (this.promptPattern && this._buffer.includes(this.promptPattern)) {
        this.emit('prompt', this._buffer);
        this._buffer = '';
      }
    });

    this.socket.on('close', () => {
      const wasConnected = this.connected;
      this.connected = false;
      this.promptPattern = null;
      if (wasConnected) {
        console.log('[CTP] Connection closed');
        this.emit('disconnected');
      }
      this._scheduleReconnect();
    });

    this.socket.on('error', (err) => {
      console.error(`[CTP] Error: ${err.message}`);
    });

    this.socket.setKeepAlive(true, 30000);
    this.socket.setTimeout(0);
  }

  _scheduleReconnect() {
    if (!this._shouldReconnect) return;
    console.log(`[CTP] Reconnecting in ${this._reconnectDelay}ms...`);
    this._reconnectTimer = setTimeout(() => {
      this._createSocket();
    }, this._reconnectDelay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, 30000);
  }

  sendRaw(text) {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(text);
    }
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
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
    }
    this.connected = false;
    this.promptPattern = null;
  }
}

module.exports = CTPConnection;
