const { parseVersion, parseCards, buildDeviceCapabilities } = require('./parser');

class DeviceCapabilitiesService {
  constructor(commandQueue, connection) {
    this.commandQueue = commandQueue;
    this.connection = connection;
    this.cached = null;
    this.pending = null;

    this.connection.on('disconnected', () => {
      this.invalidate();
    });
  }

  invalidate() {
    this.cached = null;
    this.pending = null;
  }

  getCached() {
    if (!this.cached) return null;
    if (this.cached.connectionId !== this._connectionId()) return null;
    return this.cached;
  }

  async get(forceRefresh = false) {
    if (!this.connection.connected) {
      throw new Error('Not connected to switcher');
    }

    if (!forceRefresh) {
      const cached = this.getCached();
      if (cached) return cached;
      if (this.pending) return this.pending;
    }

    this.pending = this._load();

    try {
      const capabilities = await this.pending;
      this.cached = capabilities;
      return capabilities;
    } finally {
      this.pending = null;
    }
  }

  async _load() {
    const [versionRaw, cardsRaw] = await this.commandQueue.executeBatch(['VER', 'CARDS'], 10000);
    const version = parseVersion(versionRaw);
    const cards = parseCards(cardsRaw, {
      model: version.model,
      prompt: this.connection.promptPattern,
    });

    return {
      ...buildDeviceCapabilities({
        version,
        cards,
        prompt: this.connection.promptPattern,
      }),
      connectionId: this._connectionId(),
    };
  }

  _connectionId() {
    if (this.connection.transport === 'ssh') {
      return `ssh:${this.connection.username}@${this.connection.host}:${this.connection.port}`;
    }

    return `ctp:${this.connection.host}:${this.connection.port}`;
  }
}

module.exports = DeviceCapabilitiesService;
