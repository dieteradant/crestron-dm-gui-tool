const test = require('node:test');
const assert = require('node:assert/strict');
const EventEmitter = require('events');

const CommandQueue = require('../server/ctp/command-queue');

const PROMPT = 'DM-MD8x8>';

class FakeConnection extends EventEmitter {
  constructor({ configured = true, connected = false } = {}) {
    super();
    this.configured = configured;
    this.connected = connected;
    this.sent = [];
    this.promptPattern = PROMPT;
  }

  get isConfigured() {
    return this.configured;
  }

  sendCommand(cmd) {
    this.sent.push(cmd);
  }

  resetBuffer() {}

  connect() {
    this.connected = true;
    this.emit('connected');
  }

  // Mirrors the real connection: data first, then the prompt completion signal.
  receive(text) {
    this.emit('data', text);
    if (text.includes(this.promptPattern)) {
      this.emit('prompt');
    }
  }

  drop() {
    this.connected = false;
    this.emit('disconnected');
  }
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('resolves with echo stripped when the prompt arrives', async () => {
  const queue = new CommandQueue(new FakeConnection({ connected: true }));
  const promise = queue.execute('CARDS', 1000);

  assert.deepEqual(queue.connection.sent, ['CARDS']);

  queue.connection.receive('\r\nCARDS\r\n  1: DMC-4K-HD Input Card\r\n  2: DMC-4K-C Output Card\r\nDM-MD8x8>');

  assert.equal(await promise, '1: DMC-4K-HD Input Card\n  2: DMC-4K-C Output Card');
});

test('serializes commands until each prompt arrives', async () => {
  const queue = new CommandQueue(new FakeConnection({ connected: true }));
  const first = queue.execute('VER', 1000);
  const second = queue.execute('CARDS', 1000);

  assert.deepEqual(queue.connection.sent, ['VER']);

  queue.connection.receive('VER\r\nDM-MD8x8 Cntrl Eng [v4.102]\r\nDM-MD8x8>');
  await first;
  assert.deepEqual(queue.connection.sent, ['VER', 'CARDS']);

  queue.connection.receive('CARDS\r\n  1: card\r\nDM-MD8x8>');
  assert.deepEqual(await Promise.all([first, second]), [
    'DM-MD8x8 Cntrl Eng [v4.102]',
    '1: card',
  ]);
});

test('executeDetailed flags timeouts and returns the partial response', async () => {
  const queue = new CommandQueue(new FakeConnection({ connected: true }));
  const promise = queue.executeDetailed('SLOWCMD', 30);

  queue.connection.receive('partial data, no prompt yet');
  const result = await promise;

  assert.equal(result.timedOut, true);
  assert.equal(result.disconnected, undefined);
  assert.equal(result.raw, 'partial data, no prompt yet');
  assert.equal(result.command, 'SLOWCMD');
});

test('execute() keeps the plain-string shape', async () => {
  const queue = new CommandQueue(new FakeConnection({ connected: true }));
  const promise = queue.execute('VER', 1000);
  queue.connection.receive('VER\r\nok\r\nDM-MD8x8>');
  assert.equal(typeof await promise, 'string');
});

test('completes the in-flight command early when the connection drops', async () => {
  const queue = new CommandQueue(new FakeConnection({ connected: true }));
  const promise = queue.executeDetailed('SLOWCMD', 10_000);

  queue.connection.receive('some output');
  queue.connection.drop();

  const result = await promise;
  assert.equal(result.disconnected, true);
  assert.equal(result.timedOut, false);
  assert.equal(result.raw, 'some output');
});

test('rejects with 503 when disconnected and no reconnect happens in time', async () => {
  const queue = new CommandQueue(new FakeConnection({ connected: false }), { connectWaitMs: 40 });

  await assert.rejects(queue.execute('X', 1000), (err) => {
    assert.equal(err.status, 503);
    return true;
  });
});

test('flushes queued commands after a reconnect', async () => {
  const connection = new FakeConnection({ connected: false });
  const queue = new CommandQueue(connection, { connectWaitMs: 5000, flushDelayMs: 10 });
  const promise = queue.execute('X', 1000);

  connection.connect();
  await delay(50);
  assert.deepEqual(connection.sent, ['X']);

  connection.receive('X\r\ndone\r\nDM-MD8x8>');
  assert.equal(await promise, 'done');
});

test('commands queued while disconnected reject after the bounded wait even if reconnect never fires', async () => {
  const connection = new FakeConnection({ connected: true });
  const queue = new CommandQueue(connection, { connectWaitMs: 40 });

  // First command goes out in-flight; connection drops while two more wait.
  const inFlight = queue.executeDetailed('FIRST', 5000);
  const queuedA = queue.executeDetailed('A', 5000);
  const queuedB = queue.executeDetailed('B', 5000);
  connection.drop();

  const inFlightResult = await inFlight;
  assert.equal(inFlightResult.disconnected, true);

  await assert.rejects(queuedA, (err) => err.status === 503);
  await assert.rejects(queuedB, (err) => err.status === 503);
  assert.equal(queue.queue.length, 0);
});

test('rejects immediately when no switcher is configured', async () => {
  const queue = new CommandQueue(new FakeConnection({ configured: false }));

  await assert.rejects(queue.execute('X'), (err) => {
    assert.equal(err.status, 503);
    assert.match(err.message, /configured/i);
    return true;
  });
});

test('rejects with 400 for empty or non-string commands', async () => {
  const queue = new CommandQueue(new FakeConnection({ connected: true }));

  await assert.rejects(queue.execute('   '), (err) => err.status === 400);
  await assert.rejects(queue.execute(42), (err) => err.status === 400);
  await assert.rejects(queue.execute(undefined), (err) => err.status === 400);
});
