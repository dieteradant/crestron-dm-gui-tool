class WSHandler {
  constructor(wss, connection, commandQueue) {
    this.wss = wss;
    this.connection = connection;
    this.commandQueue = commandQueue;
    this._terminalClients = new Set();
    this._subscriptions = new Map(); // channel -> Set<ws>

    // Forward raw CTP data to terminal clients
    this.connection.on('data', (data) => {
      this._broadcast('terminal', { type: 'terminal', data });
    });

    this.connection.on('connected', () => {
      this._broadcastAll(this._connectionPayload());
    });

    this.connection.on('disconnected', () => {
      this._broadcastAll(this._connectionPayload());
    });

    wss.on('connection', (ws) => {
      // Send initial connection state
      ws.send(JSON.stringify(this._connectionPayload()));

      ws.on('message', (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }
        this._handleMessage(ws, msg);
      });

      ws.on('close', () => {
        this._terminalClients.delete(ws);
        for (const subs of this._subscriptions.values()) {
          subs.delete(ws);
        }
      });
    });
  }

  _connectionPayload() {
    return {
      type: 'connection',
      connected: this.connection.connected,
      configured: this.connection.isConfigured,
      host: this.connection.host || '',
      port: this.connection.port,
      prompt: this.connection.promptPattern
    };
  }

  _handleMessage(ws, msg) {
    switch (msg.type) {
      case 'terminal':
        this._terminalClients.add(ws);
        // Send raw keystrokes directly to CTP
        this.connection.sendRaw(msg.data);
        break;

      case 'terminal-subscribe':
        this._terminalClients.add(ws);
        break;

      case 'subscribe':
        if (Array.isArray(msg.channels)) {
          for (const ch of msg.channels) {
            if (!this._subscriptions.has(ch)) {
              this._subscriptions.set(ch, new Set());
            }
            this._subscriptions.get(ch).add(ws);
          }
        }
        break;

      case 'unsubscribe':
        if (Array.isArray(msg.channels)) {
          for (const ch of msg.channels) {
            const subs = this._subscriptions.get(ch);
            if (subs) subs.delete(ws);
          }
        }
        break;
    }
  }

  _broadcast(channel, msg) {
    const json = JSON.stringify(msg);
    if (channel === 'terminal') {
      for (const ws of this._terminalClients) {
        if (ws.readyState === 1) ws.send(json);
      }
    } else {
      const subs = this._subscriptions.get(channel);
      if (subs) {
        for (const ws of subs) {
          if (ws.readyState === 1) ws.send(json);
        }
      }
    }
  }

  _broadcastAll(msg) {
    const json = JSON.stringify(msg);
    for (const ws of this.wss.clients) {
      if (ws.readyState === 1) ws.send(json);
    }
  }

  pushStatus(channel, data) {
    this._broadcast(channel, { type: 'status', channel, data });
  }
}

module.exports = WSHandler;
