const test = require('node:test');
const assert = require('node:assert/strict');
const RawSocketTransport = require('../server/ctp/transports/raw-socket');
const SshShellTransport = require('../server/ctp/transports/ssh-shell');

// These are mostly smoke tests that the modules load and expose expected surface.
// Full network tests would require real devices or heavy mocking.

test('RawSocketTransport constructs and has connect/sendRaw/destroy', () => {
  const t = new RawSocketTransport({ host: '127.0.0.1', port: 1 });
  assert.equal(typeof t.connect, 'function');
  assert.equal(typeof t.sendRaw, 'function');
  assert.equal(typeof t.destroy, 'function');
});

test('SshShellTransport constructs and has connect/sendRaw/destroy', () => {
  const t = new SshShellTransport({ host: '127.0.0.1', port: 22, username: 'u' });
  assert.equal(typeof t.connect, 'function');
  assert.equal(typeof t.sendRaw, 'function');
  assert.equal(typeof t.destroy, 'function');
});
