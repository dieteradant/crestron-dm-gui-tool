import { api } from '../lib/api.js';

export class RoutingMatrix {
  constructor(capabilities = {}) {
    this.el = document.getElementById('panel-routing');
    this.mode = 'video';
    this.routes = { video: {}, audio: {}, usb: {} };
    this.raw = '';
    this.loading = false;
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

    if (changed && this.el?.innerHTML) {
      this.render();
    }
  }

  render() {
    const hasMatrix = this.inputCount > 0 && this.outputCount > 0;

    this.el.innerHTML = `
      <div class="routing-controls">
        <label>Mode:</label>
        <select id="route-mode">
          <option value="video" ${this.mode === 'video' ? 'selected' : ''}>Video</option>
          <option value="audio" ${this.mode === 'audio' ? 'selected' : ''}>Audio</option>
          <option value="usb" ${this.mode === 'usb' ? 'selected' : ''}>USB</option>
          <option value="av" ${this.mode === 'av' ? 'selected' : ''}>A/V</option>
          <option value="avu" ${this.mode === 'avu' ? 'selected' : ''}>A/V/USB</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="route-refresh">Refresh</button>
        <button class="btn btn-secondary btn-sm" id="route-raw-toggle">Raw</button>
      </div>
      ${hasMatrix ? `
        <div class="matrix-wrapper">
          <div class="matrix" id="routing-grid" style="grid-template-columns: 80px repeat(${this.outputCount}, 52px);">
            ${this._renderHeaders()}
            ${this._renderRows()}
          </div>
        </div>
      ` : '<div class="loading">Connect to a switcher to load the routing grid.</div>'}
      <div class="raw-output" id="route-raw" style="display:none; margin-top:12px;"></div>
    `;

    const rawEl = document.getElementById('route-raw');
    if (rawEl) rawEl.textContent = this.raw;
  }

  _renderHeaders() {
    let html = '<div class="matrix-header"></div>';
    for (let output = 1; output <= this.outputCount; output++) {
      html += `<div class="matrix-header">OUT ${output}</div>`;
    }
    return html;
  }

  _renderRows() {
    let html = '';
    for (let input = 1; input <= this.inputCount; input++) {
      html += `<div class="matrix-label">IN ${input}</div>`;
      for (let output = 1; output <= this.outputCount; output++) {
        const active = this._isActive(input, output);
        html += `<div class="matrix-cell ${active ? 'active' : ''}" data-in="${input}" data-out="${output}">${active ? '●' : ''}</div>`;
      }
    }
    return html;
  }

  _isActive(input, output) {
    const modeKey = this.mode === 'av' || this.mode === 'avu' ? 'video' : this.mode;
    return this.routes[modeKey]?.[output] === input;
  }

  bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;

    this.el.addEventListener('click', async (event) => {
      const cell = event.target.closest('.matrix-cell');
      if (cell) {
        const input = parseInt(cell.dataset.in, 10);
        const output = parseInt(cell.dataset.out, 10);
        await this.setRoute(input, output);
      }
    });

    this.el.addEventListener('click', (event) => {
      if (event.target.id === 'route-refresh') this.refresh();
      if (event.target.id === 'route-raw-toggle') {
        const raw = document.getElementById('route-raw');
        if (raw) {
          raw.style.display = raw.style.display === 'none' ? 'block' : 'none';
        }
      }
    });

    this.el.addEventListener('change', (event) => {
      if (event.target.id === 'route-mode') {
        this.mode = event.target.value;
        this.updateGrid();
      }
    });
  }

  async setRoute(input, output) {
    const routeFns = {
      video: () => api.setVideoRoute(input, output),
      audio: () => api.setAudioRoute(input, output),
      usb: () => api.setUsbRoute(input, output),
      av: () => api.setAvRoute(input, output),
      avu: () => api.setAvuRoute(input, output),
    };

    try {
      await routeFns[this.mode]();
      window.app?.toast(`Routed IN ${input} → OUT ${output} (${this.mode})`, 'success');
      await this.refresh();
    } catch (err) {
      window.app?.toast(`Route failed: ${err.message}`, 'error');
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

    try {
      const data = await api.getRoutes();
      this.setCapabilities(data);
      this.routes = {
        video: data.video || {},
        audio: data.audio || {},
        usb: data.usb || {},
      };
      this.raw = data.raw || '';
      this.updateGrid();

      const rawEl = document.getElementById('route-raw');
      if (rawEl) rawEl.textContent = this.raw;
    } catch (err) {
      window.app?.toast(`Failed to load routes: ${err.message}`, 'error');
    } finally {
      this.loading = false;
    }
  }

  onShow() {
    this.refresh();
  }
}
