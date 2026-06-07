const test = require('node:test');
const assert = require('node:assert/strict');
const CommandQueue = require('../server/ctp/command-queue');

function makePromptingConnection() {
  const conn = {
    connected: false,
    promptPattern: 'DM-MD>',
    _listeners: {},
    on(event, fn) {
      this._listeners[event] = fn;
      return this;
    },
    emit(event, data) {
      const fn = this._listeners[event];
      if (fn) fn(data);
    },
    sendCommand(cmd) {
      // Emit as separate chunks to exercise buffering logic
      this.emit('data', cmd + '\r\n');
      this.emit('data', cmd + ' result\r\nDM-MD>');
    },
    resetBuffer() {},
  };
  return conn;
}

test('CommandQueue executes and resolves on prompt', async () => {
  const conn = makePromptingConnection();
  const q = new CommandQueue(conn);
  conn.connected = true;

  const p = q.execute('VER', 500);
  q._processNext();

  const res = await p;
  assert.ok(res.includes('result'));
});

test('CommandQueue rejects when not connected', async () => {
  const conn = makePromptingConnection();
  const q = new CommandQueue(conn);
  conn.connected = false;

  await assert.rejects(() => q.execute('VER', 100), /Not connected to switcher/);
});

test('CommandQueue returns partial on timeout (no prompt)', async () => {
  const conn = makePromptingConnection();
  const q = new CommandQueue(conn);
  conn.connected = true;
  conn.sendCommand = () => {
    // send something but never the prompt
    conn.emit('data', 'partial data only');
  };

  const p = q.execute('SLOW', 20);
  q._processNext();
  const res = await p;
  assert.ok(typeof res === 'string');
  assert.ok(res.includes('partial'));
});
