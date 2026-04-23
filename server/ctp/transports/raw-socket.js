const net = require('net');
const EventEmitter = require('events');

class RawSocketTransport extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.socket = null;
  }

  connect() {
    if (!this.config.host) {
      return;
    }

    this.destroy();

    this.socket = new net.Socket();
    this.socket.setKeepAlive(true, 30000);
    this.socket.setTimeout(0);

    this.socket.on('connect', () => {
      this.emit('ready');
    });

    this.socket.on('data', (data) => {
      this.emit('data', data.toString());
    });

    this.socket.on('close', () => {
      this.emit('close');
    });

    this.socket.on('error', (err) => {
      this.emit('error', err);
    });

    this.socket.connect(this.config.port, this.config.host);
  }

  sendRaw(text) {
    if (this.socket && !this.socket.destroyed) {
      this.socket.write(text);
    }
  }

  destroy() {
    if (!this.socket) {
      return;
    }

    this.socket.removeAllListeners();
    this.socket.destroy();
    this.socket = null;
  }
}

module.exports = RawSocketTransport;
