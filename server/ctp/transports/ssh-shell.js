const EventEmitter = require('events');
const { Client } = require('ssh2');

const SHELL_OPTIONS = {
  term: 'dumb',
  cols: 160,
  rows: 24,
  width: 800,
  height: 600,
};

class SshShellTransport extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.stream = null;
    this.closed = false;
  }

  connect() {
    if (!this.config.host || !this.config.username) {
      return;
    }

    this.destroy();
    this.closed = false;
    this.client = new Client();

    this.client.on('ready', () => {
      this.client.shell(SHELL_OPTIONS, (err, stream) => {
        if (err) {
          this.emit('error', err);
          this.client.end();
          return;
        }

        this.stream = stream;
        this.stream.on('data', (data) => {
          this.emit('data', data.toString());
        });

        if (this.stream.stderr) {
          this.stream.stderr.on('data', (data) => {
            this.emit('data', data.toString());
          });
        }

        this.stream.on('close', () => {
          this._handleClose();
        });

        this.emit('ready');
      });
    });

    this.client.on('keyboard-interactive', (_name, _instructions, _lang, prompts, finish) => {
      if (!Array.isArray(prompts) || prompts.length === 0) {
        finish([]);
        return;
      }

      finish(prompts.map(() => this.config.password ?? ''));
    });

    this.client.on('error', (err) => {
      this.emit('error', err);
    });

    this.client.on('close', () => {
      this._handleClose();
    });

    this.client.on('end', () => {
      this._handleClose();
    });

    this.client.connect({
      host: this.config.host,
      port: this.config.port,
      username: this.config.username,
      password: this.config.password,
      tryKeyboard: true,
      readyTimeout: 15000,
      hostVerifier: () => true,
    });
  }

  sendRaw(text) {
    if (this.stream?.writable) {
      this.stream.write(text);
    }
  }

  destroy() {
    this.closed = true;

    if (this.stream) {
      this.stream.removeAllListeners();
      try {
        this.stream.end();
      } catch {}
      this.stream = null;
    }

    if (this.client) {
      this.client.removeAllListeners();
      try {
        this.client.end();
      } catch {}
      this.client = null;
    }
  }

  _handleClose() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.emit('close');
  }
}

module.exports = SshShellTransport;
