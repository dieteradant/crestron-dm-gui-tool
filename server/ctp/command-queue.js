const { httpError } = require('../http');

const DEFAULT_TIMEOUT_MS = 5000;
// How long a command queued while disconnected waits for a reconnect before
// giving up, so HTTP callers fail instead of hanging indefinitely.
const DEFAULT_CONNECT_WAIT_MS = 15000;
// Delay after 'connected' before flushing queued commands, letting the
// device banner and first prompt settle.
const DEFAULT_FLUSH_DELAY_MS = 500;

class CommandQueue {
  constructor(connection, options = {}) {
    this.connection = connection;
    this.queue = [];
    this.busy = false;
    this._connectWaitMs = options.connectWaitMs ?? DEFAULT_CONNECT_WAIT_MS;
    this._flushDelayMs = options.flushDelayMs ?? DEFAULT_FLUSH_DELAY_MS;
    this._responseBuffer = '';
    this._current = null;

    this.connection.on('data', (data) => {
      if (!this.busy) return;
      this._responseBuffer += data;
    });

    // The connection owns prompt detection; its 'prompt' event is the single
    // completion signal for the in-flight command.
    this.connection.on('prompt', () => {
      if (!this.busy) return;
      this._finish({ timedOut: false });
    });

    // A dropped connection ends the in-flight command early with whatever
    // arrived so callers aren't stuck waiting out the full timeout. Queued
    // commands get a bounded wait for the reconnect instead of hanging.
    this.connection.on('disconnected', () => {
      if (this.busy) {
        this._finish({ timedOut: false, disconnected: true });
      }
      for (const item of this.queue) {
        this._armWaitTimer(item);
      }
    });

    // When connection comes up, flush any queued commands
    this.connection.on('connected', () => {
      if (!this.busy && this.queue.length > 0) {
        setTimeout(() => this._processNext(), this._flushDelayMs);
      }
    });
  }

  // Back-compat shape: resolves with just the response text.
  execute(command, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return this.executeDetailed(command, timeoutMs).then((result) => result.raw);
  }

  // Resolves { raw, timedOut, command } (+ disconnected: true when the
  // connection dropped mid-response). Timeouts resolve with the partial
  // response rather than rejecting — engineers need to see what came back —
  // so callers must check timedOut before trusting parsed results.
  executeDetailed(command, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (typeof command !== 'string' || command.trim() === '') {
      return Promise.reject(httpError(400, 'command required'));
    }
    if (!this.connection.isConfigured) {
      return Promise.reject(httpError(503, 'No switcher configured'));
    }

    return new Promise((resolve, reject) => {
      const item = { command, timeoutMs, resolve, reject, waitTimer: null, timeoutTimer: null };
      this.queue.push(item);

      if (!this.connection.connected) {
        this._armWaitTimer(item);
      }

      if (!this.busy && this.connection.connected) {
        this._processNext();
      }
    });
  }

  async executeBatch(commands, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const results = [];
    for (const cmd of commands) {
      results.push(await this.execute(cmd, timeoutMs));
    }
    return results;
  }

  _armWaitTimer(item) {
    if (item.waitTimer || this.connection.connected) return;
    item.waitTimer = setTimeout(() => {
      const idx = this.queue.indexOf(item);
      if (idx !== -1) this.queue.splice(idx, 1);
      item.reject(httpError(503, `Not connected to switcher (gave up after ${this._connectWaitMs}ms waiting for a connection)`));
    }, this._connectWaitMs);
  }

  _processNext() {
    if (this.queue.length === 0) {
      this.busy = false;
      return;
    }

    if (!this.connection.connected) {
      // The reconnect-flush timer can fire after a drop: leave queued items
      // to their bounded wait timers.
      this.busy = false;
      return;
    }

    this.busy = true;
    const item = this.queue.shift();
    if (item.waitTimer) {
      clearTimeout(item.waitTimer);
      item.waitTimer = null;
    }

    this._responseBuffer = '';
    this._current = item;
    this.connection.resetBuffer();

    item.timeoutTimer = setTimeout(() => {
      this._finish({ timedOut: true });
    }, item.timeoutMs);

    this.connection.sendCommand(item.command);
  }

  _finish({ timedOut, disconnected = false }) {
    const item = this._current;
    if (!item) return;
    this._current = null;
    clearTimeout(item.timeoutTimer);

    const result = {
      raw: this._cleanResponse(this._stripPrompt(this._responseBuffer), item.command),
      timedOut,
      command: item.command,
    };
    if (disconnected) result.disconnected = true;

    item.resolve(result);
    this._processNext();
  }

  _stripPrompt(raw) {
    const prompt = this.connection.promptPattern;
    if (!prompt) return raw;
    const idx = raw.lastIndexOf(prompt);
    return idx === -1 ? raw : raw.substring(0, idx);
  }

  _cleanResponse(raw, command) {
    // Strip the echoed command from the start — CTP echoes back what we
    // sent, followed by a line ending.
    let cleaned = String(raw).replace(/^[\r\n]+/, '');
    for (const eol of ['\r\n', '\n', '\r']) {
      if (cleaned.startsWith(command + eol)) {
        cleaned = cleaned.slice(command.length + eol.length);
        break;
      }
    }
    return cleaned.replace(/\r\n/g, '\n').trim();
  }

  get isConnected() {
    return this.connection.connected;
  }

  get pending() {
    return this.queue.length + (this.busy ? 1 : 0);
  }
}

module.exports = CommandQueue;
