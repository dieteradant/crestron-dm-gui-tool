export class WSClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.listeners = new Map();
    this._reconnectDelay = 1000;
    this._reconnectTimer = null;
    this._shouldReconnect = true;
  }

  connect() {
    this._shouldReconnect = true;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    this.ws = new WebSocket(`${proto}://${location.host}/ws`);

    this.ws.onopen = () => {
      this.connected = true;
      this._reconnectDelay = 1000;
      this._emit('open');
    };

    this.ws.onclose = () => {
      this.connected = false;
      this._emit('close');
      this._scheduleReconnect();
    };

    this.ws.onerror = () => {
      // close will fire after this
    };

    this.ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      this._emit('message', msg);
      if (msg.type) {
        this._emit(msg.type, msg);
      }
    };
  }

  send(msg) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  sendTerminal(data) {
    this.send({ type: 'terminal', data });
  }

  subscribe(channels) {
    this.send({ type: 'subscribe', channels });
  }

  on(event, fn) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event)?.delete(fn);
  }

  _emit(event, data) {
    const fns = this.listeners.get(event);
    if (fns) {
      for (const fn of fns) fn(data);
    }
  }

  _scheduleReconnect() {
    if (!this._shouldReconnect) return;
    this._reconnectTimer = setTimeout(() => {
      this.connect();
    }, this._reconnectDelay);
    this._reconnectDelay = Math.min(this._reconnectDelay * 2, 30000);
  }

  destroy() {
    this._shouldReconnect = false;
    clearTimeout(this._reconnectTimer);
    if (this.ws) this.ws.close();
  }
}
