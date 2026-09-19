// Pure renderers for the routing matrix grid — no DOM access, so the markup
// logic can be unit-tested directly.

function activeKey(mode) {
  return mode === 'av' || mode === 'avu' ? 'video' : mode;
}

export function renderMatrixHeaders({ outputCount, compact = false }) {
  let html = '<div class="matrix-header matrix-corner" aria-hidden="true"></div>';
  for (let output = 1; output <= outputCount; output++) {
    html += `<div class="matrix-header" data-out="${output}" role="columnheader">${compact ? output : `OUT ${output}`}</div>`;
  }
  return html;
}

export function renderMatrixRows({ inputCount, outputCount, routes, mode }) {
  const modeKey = activeKey(mode);
  let html = '';
  for (let input = 1; input <= inputCount; input++) {
    html += `<div class="matrix-label" data-in="${input}" role="rowheader">IN ${input}</div>`;
    for (let output = 1; output <= outputCount; output++) {
      const active = routes[modeKey]?.[output] === input;
      const label = `Route input ${input} to output ${output}`;
      html += `<button type="button" class="matrix-cell ${active ? 'active' : ''}" role="gridcell"
        data-in="${input}" data-out="${output}" tabindex="${input === 1 && output === 1 ? '0' : '-1'}"
        aria-pressed="${active}" title="IN ${input} \u2192 OUT ${output}" aria-label="${label}">${active ? '\u25CF' : ''}</button>`;
    }
  }
  return html;
}

export function renderMatrixGrid(options) {
  return `${renderMatrixHeaders(options)}\n${renderMatrixRows(options)}`;
}
