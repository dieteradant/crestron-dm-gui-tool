import { api } from '../lib/api.js';
import { escapeHtml, emptyState, errorState, skeletonRows } from '../lib/ui.js';

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
        <div id="net-info">${skeletonRows(3)}</div>
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
    infoEl.innerHTML = skeletonRows(3);

    try {
      const data = await api.getNetwork();
      const fields = [
        { label: 'IP Address', value: data.ip },
        { label: 'Subnet Mask', value: data.mask },
        { label: 'Gateway', value: data.gateway },
        { label: 'DHCP', value: data.dhcp },
        { label: 'Hostname', value: data.hostname },
      ].filter((f) => f.value);

      if (fields.length > 0) {
        infoEl.innerHTML = `
          <div class="info-grid">
            ${fields.map((f) => `
              <div class="info-item">
                <div class="info-label">${escapeHtml(f.label)}</div>
                <div class="info-value">${escapeHtml(f.value)}</div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        infoEl.innerHTML = emptyState('No structured data parsed', 'See the raw ethernet status below.');
      }
      rawEl.textContent = data.raw || '';
    } catch (err) {
      infoEl.innerHTML = errorState(err.message);
    }
  }

  onShow() {
    this.refresh();
  }
}
