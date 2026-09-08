import { api } from '../lib/api.js';
import { emptyState } from '../lib/ui.js';

const MODES = [
  { id: 'video', label: 'Video' },
  { id: 'audio', label: 'Audio' },
  { id: 'usb', label: 'USB' },
  { id: 'av', label: 'A/V' },
  { id: 'avu', label: 'A/V/USB' },
];

export class RoutingMatrix {
  constructor(capabilities = {}) {
    this.el = document.getElementById('panel-routing');
    this.mode = 'video';
    this.routes = { video: {}, audio: {}, usb: {} };
    this.raw = '';
    this.loading = false;
    this.compact = false;
    this.lastUpdated = null;
    this.inputCount = 0;
    this.outputCount = 0;
    this.model = null;
    this._eventsBound = false;

    this.setCapabilities(capabilities);
    this.render();
    this.bindEvents();
  }

  setCapabilities(capabilities = {}) {
    const nextInputCount = Number.isInteger(capabilities.inputCount) && capabilities.inputCount > 0 ? capabilities.inputCount : 0;
    const nextOutputCount = Number.isInteger(capabilities.outputCount) && capabilities.outputCount > 0 ? capabilities.outputCount : 0;
    const nextModel = capabilities.model || null;
    const changed = nextInputCount !== this.inputCount || nextOutputCount !== this.outputCount || nextModel !== this.model;

    this.inputCount = nextInputCount;
    this.outputCount = nextOutputCount;
    this.model = nextModel;

    if (changed) {
      // Dense chassis get the tighter cell size by default so a full 16x16
      // grid fits without horizontal scrolling on a laptop display.
      this.compact = nextOutputCount > 12;
      if (this.el?.innerHTML) this.render();
    }
  }

  render() {
    const hasMatrix = this.inputCount > 0 && this.outputCount > 0;

    this.el.innerHTML = `
      <div class="routing-controls">
        <div class="segmented" role="group" aria-label="Routing mode" id="route-mode">
          ${MODES.map((m) => `
            <button type="button" class="segmented-btn" data-mode="${m.id}" aria-pressed="${m.id === this.mode}">${m.label}</button>
          `).join('')}
        </div>
        <button class="btn btn-secondary btn-sm" id="route-refresh">Refresh</button>
        <button class="btn btn-ghost btn-sm" id="route-density" aria-pressed="${this.compact}">Compact</button>
        <button class="btn btn-ghost btn-sm" id="route-raw-toggle" aria-expanded="false" aria-controls="route-raw">Raw</button>
        <span class="spacer"></span>
        <div class="matrix-legend">
          <span class="legend-item"><span class="legend-swatch is-active"></span>Routed</span>
          <span class="legend-item"><span class="legend-swatch is-pending"></span>Pending</span>
          <span class="legend-item" id="route-updated"></span>
        </div>
      </div>
      ${hasMatrix ? `
        <div class="matrix-wrapper">
          <div class="matrix${this.compact ? ' is-compact' : ''}" id="routing-grid" role="grid"
               aria-label="Routing matrix" style="grid-template-columns: var(--label-width) repeat(${this.outputCount}, var(--cell-size));">
            ${this._renderHeaders()}
            ${this._renderRows()}
          </div>
        </div>
      ` : emptyState('No routing grid yet', 'Connect to a switcher to load inputs and outputs.')}
      <div class="raw-output raw-output-below" id="route-raw" hidden></div>
    `;

    const rawEl = document.getElementById('route-raw');
    if (rawEl) rawEl.textContent = this.raw;
    this._renderTimestamp();
  }

  _renderHeaders() {
    let html = '<div class="matrix-header matrix-corner" aria-hidden="true"></div>';
    for (let output = 1; output <= this.outputCount; output++) {
      html += `<div class="matrix-header" data-out="${output}" role="columnheader">${this.compact ? output : `OUT ${output}`}</div>`;
    }
    return html;
  }

  _renderRows() {
    let html = '';
    for (let input = 1; input <= this.inputCount; input++) {
      html += `<div class="matrix-label" data-in="${input}" role="rowheader">IN ${input}</div>`;
      for (let output = 1; output <= this.outputCount; output++) {
        const active = this._isActive(input, output);
        const label = `Route input ${input} to output ${output}`;
        html += `<button type="button" class="matrix-cell ${active ? 'active' : ''}" role="gridcell"
          data-in="${input}" data-out="${output}" tabindex="${input === 1 && output === 1 ? '0' : '-1'}"
          aria-pressed="${active}" title="IN ${input} \u2192 OUT ${output}" aria-label="${label}">${active ? '\u25CF' : ''}</button>`;
      }
    }
    return html;
  }

  _isActive(input, output) {
    const modeKey = this.mode === 'av' || this.mode === 'avu' ? 'video' : this.mode;
    return this.routes[modeKey]?.[output] === input;
  }

  _renderTimestamp() {
    const el = document.getElementById('route-updated');
    if (!el) return;
    el.textContent = this.lastUpdated
      ? `Updated ${this.lastUpdated.toLocaleTimeString()}`
      : '';
  }

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    this.el.addEventListener('click', async (event) => {
      const cell = event.target.closest('.matrix-cell');
      if (cell) {
        const input = parseInt(cell.dataset.in, 10);
        const output = parseInt(cell.dataset.out, 10);
        await this.setRoute(input, output, cell);
        return;
      }

      const modeBtn = event.target.closest('.segmented-btn');
      if (modeBtn) {
        this.mode = modeBtn.dataset.mode;
        this.el.querySelectorAll('.segmented-btn').forEach((btn) => {
          btn.setAttribute('aria-pressed', String(btn.dataset.mode === this.mode));
        });
        this.updateGrid();
        return;
      }

      const target = event.target.closest('button');
      if (!target) return;

      if (target.id === 'route-refresh') this.refresh();

      if (target.id === 'route-density') {
        this.compact = !this.compact;
        target.setAttribute('aria-pressed', String(this.compact));
        const grid = document.getElementById('routing-grid');
        grid?.classList.toggle('is-compact', this.compact);
        this.updateGrid();
      }

      if (target.id === 'route-raw-toggle') {
        const raw = document.getElementById('route-raw');
        if (raw) {
          raw.hidden = !raw.hidden;
          target.setAttribute('aria-expanded', String(!raw.hidden));
        }
      }
    });

    // Crosshair highlight so it is obvious which input/output pair a cell hits.
    this.el.addEventListener('pointerover', (event) => {
      const cell = event.target.closest('.matrix-cell');
      if (!cell) return;
      this._setCrosshair(parseInt(cell.dataset.in, 10), parseInt(cell.dataset.out, 10));
    });

    this.el.addEventListener('pointerleave', () => this._setCrosshair(null, null));

    this.el.addEventListener('focusin', (event) => {
      const cell = event.target.closest('.matrix-cell');
      if (!cell) return;
      this._setCrosshair(parseInt(cell.dataset.in, 10), parseInt(cell.dataset.out, 10));
    });

    this.el.addEventListener('keydown', (event) => {
      const cell = event.target.closest('.matrix-cell');
      if (!cell) return;
      const deltas = {
        ArrowUp: [-1, 0],
        ArrowDown: [1, 0],
        ArrowLeft: [0, -1],
        ArrowRight: [0, 1],
      };
      const delta = deltas[event.key];
      if (!delta) return;
      event.preventDefault();

      const input = Math.min(Math.max(parseInt(cell.dataset.in, 10) + delta[0], 1), this.inputCount);
      const output = Math.min(Math.max(parseInt(cell.dataset.out, 10) + delta[1], 1), this.outputCount);
      const next = this.el.querySelector(`.matrix-cell[data-in="${input}"][data-out="${output}"]`);
      if (!next) return;
      cell.tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
      this._setCrosshair(input, output);
    });
  }

  _setCrosshair(input, output) {
    this.el.querySelectorAll('.is-crosshair').forEach((el) => el.classList.remove('is-crosshair'));
    this.el.querySelectorAll('.is-highlight').forEach((el) => el.classList.remove('is-highlight'));
    if (!input || !output) return;

    this.el.querySelectorAll(`.matrix-cell[data-in="${input}"], .matrix-cell[data-out="${output}"]`)
      .forEach((el) => el.classList.add('is-crosshair'));
    this.el.querySelector(`.matrix-label[data-in="${input}"]`)?.classList.add('is-highlight');
    this.el.querySelector(`.matrix-header[data-out="${output}"]`)?.classList.add('is-highlight');
  }

  async setRoute(input, output, cell = null) {
    const routeFns = {
      video: () => api.setVideoRoute(input, output),
      audio: () => api.setAudioRoute(input, output),
      usb: () => api.setUsbRoute(input, output),
      av: () => api.setAvRoute(input, output),
      avu: () => api.setAvuRoute(input, output),
    };

    cell?.classList.add('pending');
    try {
      await routeFns[this.mode]();
      window.app?.toast(`Routed IN ${input} \u2192 OUT ${output} (${this.mode})`, 'success');
      await this.refresh();
    } catch (err) {
      window.app?.toast(`Route failed: ${err.message}`, 'error');
    } finally {
      cell?.classList.remove('pending');
    }
  }

  updateGrid() {
    const grid = document.getElementById('routing-grid');
    if (!grid) return;
    grid.innerHTML = this._renderHeaders() + this._renderRows();
  }

  async refresh() {
    if (this.loading) return;
    this.loading = true;
    const refreshBtn = document.getElementById('route-refresh');
    if (refreshBtn) refreshBtn.disabled = true;

    try {
      const data = await api.getRoutes();
      this.setCapabilities(data);
      this.routes = {
        video: data.video || {},
        audio: data.audio || {},
        usb: data.usb || {},
      };
      this.raw = data.raw || '';
      this.lastUpdated = new Date();
      this.updateGrid();
      this._renderTimestamp();

      const rawEl = document.getElementById('route-raw');
      if (rawEl) rawEl.textContent = this.raw;
    } catch (err) {
      window.app?.toast(`Failed to load routes: ${err.message}`, 'error');
    } finally {
      this.loading = false;
      const btn = document.getElementById('route-refresh');
      if (btn) btn.disabled = false;
    }
  }

  onShow() {
    this.refresh();
  }
}
