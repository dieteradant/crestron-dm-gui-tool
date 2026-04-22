class CommandQueue {
  constructor(connection) {
    this.connection = connection;
    this.queue = [];
    this.busy = false;
    this._responseBuffer = '';
    this._currentResolve = null;
    this._currentReject = null;
    this._currentTimeout = null;
    this._currentCommand = null;
    this._waitingForConnection = [];

    this.connection.on('data', (data) => {
      if (!this.busy) return;
      this._responseBuffer += data;
      this._checkForPrompt();
    });

    // When connection comes up, flush any queued commands
    this.connection.on('connected', () => {
      if (!this.busy && this.queue.length > 0) {
        // Small delay to let the banner/prompt flush through
        setTimeout(() => this._processNext(), 500);
      }
    });
  }

  execute(command, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      this.queue.push({ command, resolve, reject, timeoutMs });
      if (!this.busy && this.connection.connected) {
        this._processNext();
      }
    });
  }

  async executeBatch(commands, timeoutMs = 5000) {
    const results = [];
    for (const cmd of commands) {
      results.push(await this.execute(cmd, timeoutMs));
    }
    return results;
  }

  _processNext() {
    if (this.queue.length === 0) {
      this.busy = false;
      return;
    }

    if (!this.connection.connected) {
      this.busy = false;
      // Reject all pending with connection error
      while (this.queue.length > 0) {
        const { reject } = this.queue.shift();
        reject(new Error('Not connected to switcher'));
      }
      return;
    }

    this.busy = true;
    const { command, resolve, reject, timeoutMs } = this.queue.shift();

    this._responseBuffer = '';
    this._currentResolve = resolve;
    this._currentReject = reject;
    this._currentCommand = command;
    this.connection.resetBuffer();

    this._currentTimeout = setTimeout(() => {
      const partial = this._responseBuffer;
      this._cleanup();
      // Resolve with partial data on timeout rather than rejecting —
      // engineers need to see what came back
      resolve(partial);
      this._processNext();
    }, timeoutMs);

    this.connection.sendCommand(command);
  }

  _checkForPrompt() {
    const prompt = this.connection.promptPattern;
    if (!prompt) return;

    const promptIdx = this._responseBuffer.lastIndexOf(prompt);
    if (promptIdx === -1) return;

    // Everything before the final prompt
    const raw = this._responseBuffer.substring(0, promptIdx);
    const resolve = this._currentResolve;
    const command = this._currentCommand;
    this._cleanup();

    // Strip the echoed command from the start
    // CTP echoes back the command we sent, followed by \r\n
    let cleaned = raw;
    if (command) {
      // The echo may appear at the start, possibly with \r\n prefix
      const echoPatterns = [
        command + '\r\n',
        command + '\n',
        '\r\n' + command + '\r\n',
        '\n' + command + '\n',
      ];
      for (const echo of echoPatterns) {
        const idx = cleaned.indexOf(echo);
        if (idx !== -1 && idx < 10) {
          cleaned = cleaned.substring(idx + echo.length);
          break;
        }
      }
    }

    cleaned = cleaned.replace(/\r\n/g, '\n').trim();
    resolve(cleaned);
    this._processNext();
  }

  _cleanup() {
    clearTimeout(this._currentTimeout);
    this._currentResolve = null;
    this._currentReject = null;
    this._currentTimeout = null;
    this._currentCommand = null;
    this._responseBuffer = '';
  }

  get isConnected() {
    return this.connection.connected;
  }

  get pending() {
    return this.queue.length + (this.busy ? 1 : 0);
  }
}

module.exports = CommandQueue;
