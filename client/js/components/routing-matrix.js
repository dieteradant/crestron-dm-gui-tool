import { api } from '../lib/api.js';

export class RoutingMatrix {
  constructor() {
    this.el = document.getElementById('panel-routing');
    this.size = 8;
    this.mode = 'video';
    this.routes = { video: {}, audio: {}, usb: {} };
    this.raw = '';
    this.loading = false;
    this.render();
    this.bindEvents();
  }

  render() {
    this.el.innerHTML = `
      <div class="routing-controls">
        <label>Mode:</label>
        <select id="route-mode">
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="usb">USB</option>
          <option value="av">A/V</option>
          <option value="avu">A/V/USB</option>
        </select>
        <button class="btn btn-secondary btn-sm" id="route-refresh">Refresh</button>
        <button class="btn btn-secondary btn-sm" id="route-raw-toggle">Raw</button>
      </div>
      <div class="matrix-wrapper">
        <div class="matrix" id="routing-grid" style="grid-template-columns: 80px repeat(${this.size}, 52px);">
          ${this._renderHeaders()}
          ${this._renderRows()}
        </div>
      </div>
      <div class="raw-output" id="route-raw" style="display:none; margin-top:12px;"></div>
    `;
  }

  _renderHeaders() {
    let html = '<div class="matrix-header"></div>';
    for (let o = 1; o <= this.size; o++) {
      html += `<div class="matrix-header">OUT ${o}</div>`;
    }
    return html;
  }

  _renderRows() {
    let html = '';
    for (let i = 1; i <= this.size; i++) {
      html += `<div class="matrix-label">IN ${i}</div>`;
      for (let o = 1; o <= this.size; o++) {
        const active = this._isActive(i, o);
        html += `<div class="matrix-cell ${active ? 'active' : ''}" data-in="${i}" data-out="${o}">${active ? '●' : ''}</div>`;
      }
    }
    return html;
  }

  _isActive(input, output) {
    const modeKey = this.mode === 'av' || this.mode === 'avu' ? 'video' : this.mode;
    return this.routes[modeKey]?.[output] === input;
  }

  bindEvents() {
    this.el.addEventListener('click', async (e) => {
      const cell = e.target.closest('.matrix-cell');
      if (cell) {
        const input = parseInt(cell.dataset.in);
        const output = parseInt(cell.dataset.out);
        await this.setRoute(input, output);
      }
    });

    this.el.addEventListener('click', (e) => {
      if (e.target.id === 'route-refresh') this.refresh();
      if (e.target.id === 'route-raw-toggle') {
        const raw = document.getElementById('route-raw');
        raw.style.display = raw.style.display === 'none' ? 'block' : 'none';
      }
    });

    this.el.addEventListener('change', (e) => {
      if (e.target.id === 'route-mode') {
        this.mode = e.target.value;
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
