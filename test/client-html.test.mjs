import test from 'node:test';
import assert from 'node:assert/strict';

import { escapeHtml } from '../client/js/lib/html.mjs';

test('escapeHtml neutralizes markup, quotes, and ampersands', () => {
  assert.equal(
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
  );
  assert.equal(
    escapeHtml("it's a && b < c > d"),
    'it&#39;s a &amp;&amp; b &lt; c &gt; d',
  );
});

test('escapeHtml leaves plain text untouched', () => {
  assert.equal(escapeHtml('DMC-4K-HD HDMI 4K Input Card'), 'DMC-4K-HD HDMI 4K Input Card');
});

test('escapeHtml renders null and undefined as empty strings and stringsifies other values', () => {
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(42), '42');
});
