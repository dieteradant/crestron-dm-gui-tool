const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const createApp = require('../server/app');

const CAPABILITIES = {
  model: 'DM-MD8x8',
  firmware: 'v4.102.352400074',
  serial: '00FFC818',
  prompt: 'DM-MD8x8>',
  inputCount: 8,
  outputCount: 8,
  outputSlotOffset: 8,
  inputSlotMap: {},
  outputSlotMap: {},
  cards: [],
  raw: { version: '', cards: '' },
  connectionId: 'ctp:10.0.0.8:41795',
};

function createFakeConnection(overrides = {}) {
  return {
    connected: true,
    isConfigured: true,
    host: '10.0.0.8',
    port: 41795,
    transport: 'ctp',
    username: '',
    password: 'secret',
    promptPattern: 'DM-MD8x8>',
    reconnectTo() {},
    ...overrides,
  };
}

function createFakeQueue(overrides = {}) {
  return {
    execute: async () => 'OK',
    executeDetailed: async (command) => ({ raw: `response to ${command}`, timedOut: false, command }),
    ...overrides,
  };
}

function createFakeCapabilities(overrides = {}) {
  return {
    get: async () => ({ ...CAPABILITIES, ...overrides.get }),
    getCached: () => ({ ...CAPABILITIES, ...overrides.getCached }),
    invalidate: overrides.invalidate || (() => {}),
  };
}

async function withServer(app, run) {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await run(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const get = async (base, path) => (await fetch(base + path, { method: 'GET' })).json();
const post = async (base, path, body) => (await fetch(base + path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
}));

test('GET /api/routes parses routes and includes model metadata', async () => {
  const app = createApp({
    connection: createFakeConnection(),
    commandQueue: createFakeQueue({
      executeDetailed: async () => ({
        raw: 'Routing Information for Output Card at Slot 9\nVideo Routed From Input Card at slot 1',
        timedOut: false,
        command: 'DUMPDMROUTEInfo',
      }),
    }),
    deviceCapabilities: createFakeCapabilities(),
  });

  await withServer(app, async (base) => {
    const body = await get(base, '/api/routes');
    assert.deepEqual(body.video, { 1: 1 });
    assert.equal(body.inputCount, 8);
    assert.equal(body.outputCount, 8);
    assert.equal(body.model, 'DM-MD8x8');
    assert.equal(body.timedOut, false);
  });
});

test('GET /api/routes surfaces timedOut from the command queue', async () => {
  const app = createApp({
    connection: createFakeConnection(),
    commandQueue: createFakeQueue({
      executeDetailed: async () => ({ raw: 'truncated', timedOut: true, command: 'DUMPDMROUTEInfo' }),
    }),
    deviceCapabilities: createFakeCapabilities(),
  });

  await withServer(app, async (base) => {
    const body = await get(base, '/api/routes');
    assert.equal(body.timedOut, true);
  });
});

test('POST /api/route/:mode validates ports and ranges', async () => {
  const execute = async (command) => command;
  const app = createApp({
    connection: createFakeConnection(),
    commandQueue: createFakeQueue({ execute }),
    deviceCapabilities: createFakeCapabilities(),
  });

  await withServer(app, async (base) => {
    const missing = await post(base, '/api/route/video', { input: 1 });
    assert.equal(missing.status, 400);

    const nonInt = await post(base, '/api/route/video', { input: 'abc', output: 2 });
    assert.equal(nonInt.status, 400);

    const zero = await post(base, '/api/route/audio', { input: 0, output: 2 });
    assert.equal(zero.status, 400);

    const outOfRange = await post(base, '/api/route/video', { input: 99, output: 2 });
    assert.equal(outOfRange.status, 400);

    const ok = await post(base, '/api/route/avu', { input: 2, output: 3 });
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { success: true, raw: 'SETAVUROUTE 2 3' });
  });
});

test('not-connected queue errors map to 503', async () => {
  const notConnected = new Error('Not connected to switcher');
  notConnected.status = 503;
  const app = createApp({
    connection: createFakeConnection(),
    commandQueue: createFakeQueue({ execute: async () => { throw notConnected; } }),
    deviceCapabilities: createFakeCapabilities(),
  });

  await withServer(app, async (base) => {
    const res = await fetch(base + '/api/network');
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'Not connected to switcher' });
  });
});

test('unexpected queue errors map to 500', async () => {
  const app = createApp({
    connection: createFakeConnection(),
    commandQueue: createFakeQueue({ execute: async () => { throw new Error('device blew up'); } }),
    deviceCapabilities: createFakeCapabilities(),
  });

  await withServer(app, async (base) => {
    const res = await fetch(base + '/api/network');
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: 'device blew up' });
  });
});

test('GET /api/connection exposes state without leaking the password', async () => {
  const app = createApp({
    connection: createFakeConnection(),
    commandQueue: createFakeQueue(),
    deviceCapabilities: createFakeCapabilities(),
  });

  await withServer(app, async (base) => {
    const body = await get(base, '/api/connection');
    assert.equal(body.connected, true);
    assert.equal(body.hasPassword, true);
    assert.equal(body.password, undefined);
    assert.equal('password' in body, false);
  });
});

test('POST /api/connection validates and delegates to reconnectTo', async () => {
  const calls = { reconnect: [], invalidated: 0 };
  const app = createApp({
    connection: createFakeConnection({
      reconnectTo: (config) => calls.reconnect.push(config),
    }),
    commandQueue: createFakeQueue(),
    deviceCapabilities: createFakeCapabilities({
      invalidate: () => { calls.invalidated += 1; },
    }),
  });

  await withServer(app, async (base) => {
    const noHost = await post(base, '/api/connection', { host: '' });
    assert.equal(noHost.status, 400);

    const noSshUser = await post(base, '/api/connection', { host: 'sw.local', transport: 'ssh' });
    assert.equal(noSshUser.status, 400);

    const ok = await post(base, '/api/connection', { host: ' sw.local ' });
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.equal(body.success, true);
    assert.equal(body.host, 'sw.local');
    assert.equal(body.port, 41795);
    // CTP connections don't carry credentials, so nothing to report
    assert.equal(body.hasPassword, false);

    assert.equal(calls.invalidated, 1);
    assert.equal(calls.reconnect.length, 1);
    assert.equal(calls.reconnect[0].host, 'sw.local');
  });
});

test('POST /api/command requires a command and forwards the timeout', async () => {
  const calls = [];
  const app = createApp({
    connection: createFakeConnection(),
    commandQueue: createFakeQueue({
      executeDetailed: async (command, timeout) => {
        calls.push([command, timeout]);
        return { raw: 'done', timedOut: false, command };
      },
    }),
    deviceCapabilities: createFakeCapabilities(),
  });

  await withServer(app, async (base) => {
    const missing = await post(base, '/api/command', {});
    assert.equal(missing.status, 400);

    const ok = await post(base, '/api/command', { command: 'VER', timeout: 2500 });
    const body = await ok.json();
    assert.equal(body.raw, 'done');
    assert.equal(body.timedOut, false);
    assert.deepEqual(calls, [['VER', 2500]]);
  });
});

test('malformed JSON bodies get a JSON 400', async () => {
  const app = createApp({
    connection: createFakeConnection(),
    commandQueue: createFakeQueue(),
    deviceCapabilities: createFakeCapabilities(),
  });

  await withServer(app, async (base) => {
    const res = await fetch(base + '/api/route/video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /JSON/);
  });
});
