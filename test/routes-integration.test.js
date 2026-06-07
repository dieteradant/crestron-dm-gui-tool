const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');

const DeviceCapabilitiesService = require('../server/ctp/device-capabilities');
const createRoutingRouter = require('../server/routes/routing');
const createStatusRouter = require('../server/routes/status');
const createSystemRouter = require('../server/routes/system');
const { commandLimiter, mutationLimiter, readLimiter } = require('../server/rate-limits');

function createTestApp({ execute = async () => 'OK', connected = true } = {}) {
  const app = express();
  app.use(express.json());

  const fakeConn = {
    connected,
    isConfigured: true,
    host: 'test',
    port: 1,
    transport: 'ctp',
    username: '',
    password: '',
    promptPattern: 'DM>',
    on() {
      return this;
    },
    emit() {},
    sendCommand() {},
    resetBuffer() {},
    destroy() {},
  };

  const cq = {
    async execute(cmd, to) {
      return execute(cmd, to);
    },
    async executeBatch(cmds) {
      return Promise.all(cmds.map((c) => execute(c)));
    },
    connection: fakeConn,
  };

  const caps = new DeviceCapabilitiesService(cq, fakeConn);
  caps.get = async () => ({
    model: 'DM-MD8x8',
    inputCount: 8,
    outputCount: 8,
    outputSlotOffset: 16,
    cards: [],
    inputSlotMap: {},
    outputSlotMap: {},
    connectionId: 'test',
  });

  app.use('/api', readLimiter);
  app.use('/api/routes', mutationLimiter, createRoutingRouter(cq, caps));
  app.use('/api/route', mutationLimiter, createRoutingRouter(cq, caps));
  app.use('/api', readLimiter, createStatusRouter(cq, caps));
  app.use('/api', readLimiter, createSystemRouter(cq));

  app.post('/api/command', commandLimiter, async (req, res) => {
    try {
      const raw = await cq.execute(req.body.command, req.body.timeout || 1000);
      res.json({ raw });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}

test('GET /api/routes returns parsed routes + counts', async () => {
  const app = createTestApp({
    execute: async (cmd) => {
      if (cmd === 'DUMPDMROUTEInfo') {
        return [
          'Routing Information for Output Card at Slot 17',
          'Video Routed From Input Card at slot 1',
          'Audio Routed From Input Card at slot 1',
        ].join('\n');
      }
      return '';
    },
  });
  const res = await request(app).get('/api/routes');
  assert.equal(res.status, 200);
  assert.equal(res.body.inputCount, 8);
  assert.deepEqual(res.body.video, { 1: 1 });
});

test('POST /api/route/video succeeds with valid input/output', async () => {
  const app = createTestApp();
  const res = await request(app).post('/api/route/video').send({ input: 1, output: 2 });
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('POST /api/route/video rejects missing fields', async () => {
  const app = createTestApp();
  const res = await request(app).post('/api/route/video').send({ input: 1 });
  assert.equal(res.status, 400);
});

test('GET /api/errors and POST /api/errors/clear work', async () => {
  const app = createTestApp({
    execute: async (cmd) => (cmd === 'ERRlog' ? 'Error log\n--\nfoo' : 'cleared'),
  });
  const e1 = await request(app).get('/api/errors');
  assert.equal(e1.status, 200);
  assert.ok(Array.isArray(e1.body.entries));

  const e2 = await request(app).post('/api/errors/clear');
  assert.equal(e2.status, 200);
  assert.equal(e2.body.success, true);
});

test('POST /api/system/reboot requires confirm', async () => {
  const app = createTestApp();
  const bad = await request(app).post('/api/system/reboot').send({});
  assert.equal(bad.status, 400);
  const good = await request(app).post('/api/system/reboot').send({ confirm: true });
  assert.equal(good.status, 200);
});

test(
  'POST /api/command is rate limited (only when not in NODE_ENV=test)',
  { skip: process.env.NODE_ENV === 'test' },
  async () => {
    const app = createTestApp();
    const results = [];
    for (let i = 0; i < 10; i++) {
      results.push(await request(app).post('/api/command').send({ command: 'VER' }));
    }
    const tooMany = results.some((r) => r.status === 429);
    assert.ok(tooMany, 'should have hit rate limit');
  }
);
