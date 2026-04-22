import { api } from '../lib/api.js';

export class NetworkPanel {
  constructor() {
    this.el = document.getElementById('panel-network');
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Network Configuration</span>
          <button class="btn btn-secondary btn-sm" id="net-refresh">Refresh</button>
        </div>
        <div class="info-grid" id="net-info">
          <div class="loading">Loading...</div>
        </div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Raw Ethernet Status</span>
        </div>
        <div class="raw-output" id="net-raw"></div>
      </div>
    `;
    this.el.querySelector('#net-refresh').addEventListener('click', () => this.refresh());
  }

  async refresh() {
    const infoEl = this.el.querySelector('#net-info');
    const rawEl = this.el.querySelector('#net-raw');
    infoEl.innerHTML = '<div class="loading">Loading...</div>';

    try {
      const data = await api.getNetwork();
      const fields = [
        { label: 'IP Address', value: data.ip },
        { label: 'Subnet Mask', value: data.mask },
        { label: 'Gateway', value: data.gateway },
        { label: 'DHCP', value: data.dhcp },
        { label: 'Hostname', value: data.hostname },
      ].filter(f => f.value);

      if (fields.length > 0) {
        infoEl.innerHTML = fields.map(f => `
          <div class="info-item">
            <div class="info-label">${f.label}</div>
            <div class="info-value">${f.value}</div>
          </div>
        `).join('');
      } else {
        infoEl.innerHTML = '<div class="loading">No structured data parsed — see raw output below</div>';
      }
      rawEl.textContent = data.raw || '';
    } catch (err) {
      infoEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
  }

  onShow() {
    this.refresh();
  }
}
