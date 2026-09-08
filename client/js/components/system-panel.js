import { api } from '../lib/api.js';
import { escapeHtml, errorState, skeletonRows } from '../lib/ui.js';

export class SystemPanel {
  constructor() {
    this.el = document.getElementById('panel-system');
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">System Info</span>
          <button class="btn btn-secondary btn-sm" id="sys-refresh">Refresh</button>
        </div>
        <div id="sys-info">${skeletonRows(3)}</div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Error Log</span>
          <div class="btn-row">
            <button class="btn btn-secondary btn-sm" id="err-refresh">Refresh</button>
            <button class="btn btn-danger btn-sm" id="err-clear">Clear</button>
          </div>
        </div>
        <div class="raw-output" id="err-log" style="max-height:300px;"></div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Memory &amp; Processes</span>
          <div class="btn-row">
            <button class="btn btn-secondary btn-sm" id="mem-refresh">Memory</button>
            <button class="btn btn-secondary btn-sm" id="top-refresh">TOP</button>
          </div>
        </div>
        <div class="raw-output" id="sys-extra" hidden></div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Front Panel</span>
          <button class="btn btn-secondary btn-sm" id="fp-lockout-btn">Lockout Status</button>
        </div>
      </div>
      <div class="panel-section section-danger">
        <div class="section-header">
          <span class="section-title">Danger Zone</span>
        </div>
        <div class="section-subtitle">Rebooting takes the switcher offline for one to two minutes.</div>
        <button class="btn btn-danger" id="reboot-btn">Reboot Connected Device</button>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    this.el.querySelector('#sys-refresh').addEventListener('click', () => this.refresh());
    this.el.querySelector('#err-refresh').addEventListener('click', () => this.loadErrors());
    this.el.querySelector('#err-clear').addEventListener('click', async () => {
      try {
        await api.clearErrors();
        window.app?.toast('Error log cleared', 'success');
        this.loadErrors();
      } catch (err) {
        window.app?.toast(err.message, 'error');
      }
    });

    this.el.querySelector('#mem-refresh').addEventListener('click', () => this.loadExtra('memory'));
    this.el.querySelector('#top-refresh').addEventListener('click', () => this.loadExtra('top'));

    this.el.querySelector('#fp-lockout-btn').addEventListener('click', async () => {
      try {
        const data = await api.getFpLockout();
        window.app?.toast(data.raw || 'OK', 'info');
      } catch (err) {
        window.app?.toast(err.message, 'error');
      }
    });

    this.el.querySelector('#reboot-btn').addEventListener('click', () => {
      this.confirmReboot();
    });
  }

  async refresh() {
    const infoEl = this.el.querySelector('#sys-info');
    infoEl.innerHTML = skeletonRows(3);

    try {
      const [ver, uptime] = await Promise.all([api.getVersion(), api.getUptime()]);
      const fields = [
        { label: 'Firmware', value: ver.firmware || ver.raw },
        { label: 'Model', value: ver.model },
        { label: 'Serial', value: ver.serial },
        { label: 'Uptime', value: uptime.uptime },
      ].filter((f) => f.value);

      const items = fields.map((f) => `
        <div class="info-item">
          <div class="info-label">${escapeHtml(f.label)}</div>
          <div class="info-value">${escapeHtml(f.value)}</div>
        </div>
      `);

      if (ver.info) {
        items.push(`
          <div class="info-item info-item-wide">
            <div class="info-label">Info</div>
            <div class="info-value info-value-block">${escapeHtml(ver.info)}</div>
          </div>
        `);
      }

      infoEl.innerHTML = `<div class="info-grid">${items.join('')}</div>`;
    } catch (err) {
      infoEl.innerHTML = errorState(err.message);
    }
  }

  async loadErrors() {
    const logEl = this.el.querySelector('#err-log');
    logEl.textContent = 'Loading...';
    try {
      const data = await api.getErrors();
      logEl.textContent = data.raw || data.entries?.join('\n') || 'No errors';
    } catch (err) {
      logEl.textContent = `Error: ${err.message}`;
    }
  }

  async loadExtra(type) {
    const extraEl = this.el.querySelector('#sys-extra');
    extraEl.hidden = false;
    extraEl.textContent = 'Loading...';
    try {
      const data = type === 'memory' ? await api.getMemory() : await api.getTop();
      extraEl.textContent = data.raw || JSON.stringify(data, null, 2);
    } catch (err) {
      extraEl.textContent = `Error: ${err.message}`;
    }
  }

  confirmReboot() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="reboot-title">
        <h3 id="reboot-title">Reboot Connected Device?</h3>
        <p>This will reboot the currently connected matrix switcher. Active routes may be preserved by the hardware, but the device will likely be offline for 1-2 minutes.</p>
        <p class="modal-warning">This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="reboot-cancel">Cancel</button>
          <button class="btn btn-danger" id="reboot-confirm">Reboot</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKeydown);
    };
    const onKeydown = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeydown);

    overlay.querySelector('#reboot-cancel').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    overlay.querySelector('#reboot-cancel').focus();

    overlay.querySelector('#reboot-confirm').addEventListener('click', async () => {
      close();
      try {
        await api.reboot();
        window.app?.toast('Reboot command sent', 'info');
      } catch (err) {
        window.app?.toast(`Reboot failed: ${err.message}`, 'error');
      }
    });
  }

  onShow() {
    this.refresh();
    this.loadErrors();
  }
}
