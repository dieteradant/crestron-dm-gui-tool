const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_PORTS,
  defaultPortForTransport,
  normalizeConnectionConfig,
  normalizeTransport,
} = require('../server/ctp/connection-config');

test('normalizeTransport defaults to ctp', () => {
  assert.equal(normalizeTransport(), 'ctp');
  assert.equal(normalizeTransport('CTP'), 'ctp');
  assert.equal(normalizeTransport('unknown'), 'ctp');
});

test('defaultPortForTransport returns transport-specific defaults', () => {
  assert.equal(defaultPortForTransport('ctp'), DEFAULT_PORTS.ctp);
  assert.equal(defaultPortForTransport('ssh'), DEFAULT_PORTS.ssh);
});

test('normalizeConnectionConfig trims host and username and defaults ssh to port 22', () => {
  const config = normalizeConnectionConfig({
    host: ' 192.168.99.192 ',
    transport: 'ssh',
    username: ' admin ',
    password: '',
  });

  assert.deepEqual(config, {
    host: '192.168.99.192',
    port: 22,
    transport: 'ssh',
    username: 'admin',
    password: '',
  });
});

test('normalizeConnectionConfig does not carry a stale ctp port into ssh', () => {
  const config = normalizeConnectionConfig(
    { transport: 'ssh', username: 'crestron' },
    { host: '192.168.99.192', port: 41795, transport: 'ctp' },
  );

  assert.equal(config.host, '192.168.99.192');
  assert.equal(config.port, 22);
  assert.equal(config.transport, 'ssh');
  assert.equal(config.username, 'crestron');
});
