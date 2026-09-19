import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderMatrixGrid,
  renderMatrixHeaders,
  renderMatrixRows,
} from '../client/js/lib/matrix-grid.mjs';

test('renderMatrixHeaders emits one column per output', () => {
  const html = renderMatrixHeaders({ outputCount: 3 });
  assert.equal((html.match(/class="matrix-header"/g) || []).length, 3);
  assert.match(html, />OUT 1</);
  assert.match(html, />OUT 3</);
  assert.match(html, /matrix-corner/);
});

test('renderMatrixHeaders uses bare numbers in compact mode', () => {
  const html = renderMatrixHeaders({ outputCount: 2, compact: true });
  assert.doesNotMatch(html, />OUT 1</);
  assert.match(html, /role="columnheader">1</);
});

test('renderMatrixRows emits an input x output grid of cells', () => {
  const html = renderMatrixRows({
    inputCount: 2,
    outputCount: 3,
    routes: { video: {} },
    mode: 'video',
  });

  assert.equal((html.match(/class="matrix-cell/g) || []).length, 6);
  assert.match(html, /role="rowheader">IN 1</);
  assert.match(html, /data-in="2" data-out="3"/);
  assert.match(html, /tabindex="0"/, 'first cell is keyboard-focusable');
});

test('renderMatrixRows marks the active route for the current mode', () => {
  const html = renderMatrixRows({
    inputCount: 4,
    outputCount: 2,
    routes: { video: { 1: 2 }, audio: { 1: 3 } },
    mode: 'video',
  });

  const activeCell = 'class="matrix-cell active"';
  assert.equal((html.match(new RegExp(activeCell, 'g')) || []).length, 1);
  assert.match(html, /data-in="2" data-out="1"[^>]*aria-pressed="true"/);
});

test('renderMatrixRows falls back to video routes for combined av modes', () => {
  const html = renderMatrixRows({
    inputCount: 2,
    outputCount: 1,
    routes: { video: { 1: 2 }, audio: { 1: 1 }, usb: { 1: 1 } },
    mode: 'av',
  });

  assert.match(html, /aria-pressed="true"/);
  assert.equal((html.match(/class="matrix-cell active"/g) || []).length, 1);
});

test('renderMatrixGrid combines headers and rows', () => {
  const html = renderMatrixGrid({
    inputCount: 1,
    outputCount: 1,
    routes: { video: {} },
    mode: 'video',
  });

  assert.match(html, /matrix-corner/);
  assert.match(html, /matrix-cell/);
});
