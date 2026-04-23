const test = require('node:test');
const assert = require('node:assert/strict');

const {
  parseCards,
  parseRoutes,
  parseVersion,
  buildDeviceCapabilities,
} = require('../server/ctp/parser');

test('parseCards classifies DM-MD8x8 cards from model dimensions', () => {
  const raw = [
    '  1: DMC-4K-HD HDMI 4K Input Card [v1.2911.00108, #00EB3249] Stream:b0.0',
    '  8: DMC-4K-HD HDMI 4K Input Card [v1.2911.00108, #00EB3250] Stream:b7.0',
    ' 17: DMC-4K-HD HDMI 4K Output Card [v1.2911.00108, #00EB3251] Stream:c0.0',
    ' 24: DMC-4K-HD HDMI 4K Output Card [v1.2911.00108, #00EB3252] Stream:c7.0',
  ].join('\n');

  const parsed = parseCards(raw, { model: 'DM-MD8x8' });

  assert.equal(parsed.inputCount, 8);
  assert.equal(parsed.outputCount, 8);
  assert.equal(parsed.cards.find(card => card.slot === 8)?.role, 'input');
  assert.equal(parsed.cards.find(card => card.slot === 24)?.portNum, 8);
});

test('parseCards classifies DM-MD16x16 cards from model dimensions', () => {
  const raw = [
    '  1: DMC-4K-HD HDMI 4K Input Card [v1.2911.00108, #00EB3249] Stream:b0.0',
    ' 16: DMC-4K-C DM 8G+ Input Card [v1.2874.00042, #00EB3250] Stream:b15.0',
    ' 17: DMC-4K-HD HDMI 4K Output Card [v1.2911.00108, #00EB3251] Stream:c0.0',
    ' 32: DMC-4K-C DM 8G+ Output Card [v1.2874.00042, #00EB3252] Stream:c15.0',
  ].join('\n');

  const parsed = parseCards(raw, { model: 'DM-MD16x16' });

  assert.equal(parsed.inputCount, 16);
  assert.equal(parsed.outputCount, 16);
  assert.equal(parsed.cards.find(card => card.slot === 16)?.portNum, 16);
  assert.equal(parsed.cards.find(card => card.slot === 32)?.role, 'output');
});

test('parseRoutes maps 16x16 output slots through capabilities', () => {
  const raw = [
    'Routing Information for Output Card at Slot 17',
    'Video Routed From Input Card at slot 1',
    'Audio Routed From Input Card at slot 1',
    'USB Host Routed to Card at slot 2',
    'Routing Information for Output Card at Slot 32',
    'Video Routed From Input Card at slot 16',
    'Audio Routed From Input Card at slot 15',
    'USB Host Routed to Card at slot 14',
  ].join('\n');

  const parsed = parseRoutes(raw, {
    outputCount: 16,
    outputSlotOffset: 16,
    inputSlotMap: { 1: 1, 14: 14, 15: 15, 16: 16 },
    outputSlotMap: { 17: 1, 32: 16 },
  });

  assert.deepEqual(parsed.video, { 1: 1, 16: 16 });
  assert.deepEqual(parsed.audio, { 1: 1, 16: 15 });
  assert.deepEqual(parsed.usb, { 1: 2, 16: 14 });
});

test('buildDeviceCapabilities exposes slot maps and counts', () => {
  const version = parseVersion('DM-MD16x16 Cntrl Eng [v4.102.352400074 (Sep 23 2019), #00FFC818]');
  const cards = parseCards([
    '  1: DMC-4K-HD HDMI 4K Input Card [v1.2911.00108, #00EB3249] Stream:b0.0',
    ' 16: DMC-4K-C DM 8G+ Input Card [v1.2874.00042, #00EB3250] Stream:b15.0',
    ' 17: DMC-4K-HD HDMI 4K Output Card [v1.2911.00108, #00EB3251] Stream:c0.0',
    ' 32: DMC-4K-C DM 8G+ Output Card [v1.2874.00042, #00EB3252] Stream:c15.0',
  ].join('\n'), { model: version.model });

  const capabilities = buildDeviceCapabilities({
    version,
    cards,
    prompt: 'DM-MD16x16>',
  });

  assert.equal(capabilities.model, 'DM-MD16x16');
  assert.equal(capabilities.inputCount, 16);
  assert.equal(capabilities.outputCount, 16);
  assert.equal(capabilities.inputSlotMap[16], 16);
  assert.equal(capabilities.outputSlotMap[32], 16);
});
