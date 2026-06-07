const test = require('node:test');
const assert = require('node:assert/strict');
const DeviceCapabilitiesService = require('../server/ctp/device-capabilities');

function makeFakeConn() {
  const ev = {};
  return {
    connected: true,
    transport: 'ctp',
    host: '127.0.0.1',
    port: 41795,
    promptPattern: 'DM-MD16x16>',
    on(e, fn) {
      ev[e] = fn;
    },
    emit(e, d) {
      if (ev[e]) ev[e](d);
    },
  };
}

function makeFakeQueue(responses) {
  let i = 0;
  return {
    async executeBatch() {
      const r = responses[i++] || '';
      return Array.isArray(r) ? r : [r];
    },
    async execute(cmd) {
      if (responses.length) return responses.shift();
      return '';
    },
  };
}

test('DeviceCapabilitiesService caches and returns parsed model/counts', async () => {
  const conn = makeFakeConn();
  const q = makeFakeQueue([
    'DM-MD8x8 Cntrl Eng [v4.102.352400074 (Sep 23 2019), #00FFC818]',
    [
      '  1: DMC-4K-HD HDMI 4K Input Card [v1.2911.00108, #00EB3249] Stream:b0.0',
      '  8: DMC-4K-HD HDMI 4K Input Card Stream:b7.0',
      ' 17: DMC-4K-HD HDMI 4K Output Card Stream:c0.0',
      ' 24: DMC-4K-HD HDMI 4K Output Card Stream:c7.0',
    ].join('\n'),
  ]);
  const svc = new DeviceCapabilitiesService(q, conn);
  const caps = await svc.get();
  assert.equal(caps.model, 'DM-MD8x8');
  assert.equal(caps.inputCount, 8);
  assert.equal(caps.outputCount, 8);
  assert.equal(caps.cards.length, 4);
  // second call hits cache
  const caps2 = await svc.get();
  assert.equal(caps2, caps);
});

test('DeviceCapabilitiesService invalidates on disconnect', () => {
  const conn = makeFakeConn();
  const q = makeFakeQueue([]);
  const svc = new DeviceCapabilitiesService(q, conn);
  svc.cached = { foo: 1, connectionId: 'ctp:127.0.0.1:41795' };
  if (conn.emit) conn.emit('disconnected');
  assert.equal(svc.getCached(), null);
});
