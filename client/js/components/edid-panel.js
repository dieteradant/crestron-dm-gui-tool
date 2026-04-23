import { api } from '../lib/api.js';

export class EdidPanel {
  constructor(capabilities = {}) {
    this.el = document.getElementById('panel-edid');
    this.inputCount = 0;
    this.outputCount = 0;
    this.model = null;

    this.setCapabilities(capabilities);
    this.render();
  }

  setCapabilities(capabilities = {}) {
    this.inputCount = Number.isInteger(capabilities.inputCount) && capabilities.inputCount > 0 ? capabilities.inputCount : 0;
    this.outputCount = Number.isInteger(capabilities.outputCount) && capabilities.outputCount > 0 ? capabilities.outputCount : 0;
    this.model = capabilities.model || null;

    if (this.el?.innerHTML) {
      this.render();
    }
  }

  _renderPortButtons(type, count) {
    if (count < 1) {
      return '<div class="loading" style="padding:12px 0;">No ports detected yet.</div>';
    }

    return Array.from({ length: count }, (_, index) => `
      <button class="btn btn-secondary btn-sm edid-${type}-btn" data-port="${index + 1}">${type.toUpperCase()} ${index + 1}</button>
    `).join('');
  }

  _renderPortOptions(prefix, count) {
    if (count < 1) {
      return '<option value="">No ports available</option>';
    }

    return Array.from({ length: count }, (_, index) => `<option value="${index + 1}">${prefix} ${index + 1}</option>`).join('');
  }

  render() {
    this.el.innerHTML = `
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">EDID Overview</span>
          <div>
            <button class="btn btn-secondary btn-sm" id="edid-refresh">Refresh</button>
            <button class="btn btn-secondary btn-sm" id="edid-lockout-btn">Lockout Status</button>
          </div>
        </div>
        <div class="raw-output" id="edid-overview">Loading...</div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Input EDID Info</span>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
          ${this._renderPortButtons('in', this.inputCount)}
        </div>
        <div class="raw-output" id="edid-input-detail" style="display:none;"></div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Output EDID Info</span>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
          ${this._renderPortButtons('out', this.outputCount)}
        </div>
        <div class="raw-output" id="edid-output-detail" style="display:none;"></div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">EDID Actions</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <label style="font-size:13px;color:var(--text-secondary);">Copy TX EDID:</label>
          <select id="edid-copy-src" style="background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);padding:4px 8px;border-radius:3px;">
            ${this._renderPortOptions('OUT', this.outputCount)}
          </select>
          <span style="color:var(--text-dim)">→</span>
          <select id="edid-copy-dst" style="background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);padding:4px 8px;border-radius:3px;">
            ${this._renderPortOptions('IN', this.inputCount)}
          </select>
          <button class="btn btn-primary btn-sm" id="edid-copy-btn">Copy</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap;">
          <label style="font-size:13px;color:var(--text-secondary);">Force Default EDID:</label>
          <select id="edid-force-port" style="background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);padding:4px 8px;border-radius:3px;">
            ${this._renderPortOptions('IN', this.inputCount)}
          </select>
          <button class="btn btn-secondary btn-sm" id="edid-force-default-btn">Force Default</button>
          <button class="btn btn-secondary btn-sm" id="edid-force-sent-btn">Force Sent</button>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.el.querySelector('#edid-refresh').addEventListener('click', () => this.refresh());
    this.el.querySelector('#edid-lockout-btn').addEventListener('click', async () => {
      try {
        const data = await api.getEdidLockout();
        window.app?.toast(data.raw || 'OK', 'info');
      } catch (err) {
        window.app?.toast(err.message, 'error');
      }
    });

    this.el.querySelectorAll('.edid-in-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const detail = this.el.querySelector('#edid-input-detail');
        detail.style.display = 'block';
        detail.textContent = 'Loading...';
        try {
          const data = await api.getEdidInput(btn.dataset.port);
          detail.textContent = data.raw || JSON.stringify(data, null, 2);
        } catch (err) {
          detail.textContent = `Error: ${err.message}`;
        }
      });
    });

    this.el.querySelectorAll('.edid-out-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const detail = this.el.querySelector('#edid-output-detail');
        detail.style.display = 'block';
        detail.textContent = 'Loading...';
        try {
          const data = await api.getEdidOutput(btn.dataset.port);
          detail.textContent = data.raw || JSON.stringify(data, null, 2);
        } catch (err) {
          detail.textContent = `Error: ${err.message}`;
        }
      });
    });

    this.el.querySelector('#edid-copy-btn').addEventListener('click', async () => {
      const src = this.el.querySelector('#edid-copy-src').value;
      const dst = this.el.querySelector('#edid-copy-dst').value;
      if (!src || !dst) return;

      try {
        await api.copyTxEdid(src, dst);
        window.app?.toast(`Copied TX EDID from OUT ${src} to IN ${dst}`, 'success');
      } catch (err) {
        window.app?.toast(`Copy failed: ${err.message}`, 'error');
      }
    });

    this.el.querySelector('#edid-force-default-btn').addEventListener('click', async () => {
      const port = this.el.querySelector('#edid-force-port').value;
      if (!port) return;

      try {
        await api.forceDefaultEdid(port);
        window.app?.toast(`Forced default EDID on IN ${port}`, 'success');
      } catch (err) {
        window.app?.toast(err.message, 'error');
      }
    });

    this.el.querySelector('#edid-force-sent-btn').addEventListener('click', async () => {
      const port = this.el.querySelector('#edid-force-port').value;
      if (!port) return;

      try {
        await api.forceEdid(port);
        window.app?.toast(`Forced sent EDID on IN ${port}`, 'success');
      } catch (err) {
        window.app?.toast(err.message, 'error');
      }
    });
  }

  async refresh() {
    const overview = this.el.querySelector('#edid-overview');
    overview.textContent = 'Loading...';

    try {
      const data = await api.getEdid();
      overview.textContent = data.raw || JSON.stringify(data, null, 2);
    } catch (err) {
      overview.textContent = `Error: ${err.message}`;
    }
  }

  onShow() {
    this.refresh();
  }
}
