import { api } from '../lib/api.js';

export class StatusPanel {
  constructor() {
    this.el = document.getElementById('panel-status');
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Input Cards</span>
          <button class="btn btn-secondary btn-sm" id="status-refresh">Refresh</button>
        </div>
        <div id="input-cards-table"><div class="loading">Loading...</div></div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Output Cards</span>
        </div>
        <div id="output-cards-table"></div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">System Cards</span>
        </div>
        <div id="system-cards-table"></div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">DM Info</span>
          <div>
            <button class="btn btn-secondary btn-sm" id="topology-refresh">Topology</button>
            <button class="btn btn-secondary btn-sm" id="endpoints-refresh">Endpoints</button>
            <button class="btn btn-secondary btn-sm" id="streams-refresh">Streams</button>
          </div>
        </div>
        <div class="raw-output" id="dm-raw" style="display:none;"></div>
      </div>
    `;
    this.bindEvents();
  }

  bindEvents() {
    this.el.querySelector('#status-refresh').addEventListener('click', () => this.refresh());
    this.el.querySelector('#topology-refresh').addEventListener('click', () => this.loadDM('topology'));
    this.el.querySelector('#endpoints-refresh').addEventListener('click', () => this.loadDM('endpoints'));
    this.el.querySelector('#streams-refresh').addEventListener('click', () => this.loadDM('streams'));
  }

  _renderCardsTable(cards) {
    if (!cards.length) return '<div class="loading">No cards detected</div>';
    return `
      <table class="data-table">
        <thead><tr><th>Slot</th><th>Port</th><th>Type</th><th>Description</th><th>Firmware</th><th>Stream</th></tr></thead>
        <tbody>
          ${cards.map(c => `
            <tr>
              <td>${c.slot}</td>
              <td>${c.portNum ?? '-'}</td>
              <td style="font-weight:600">${c.type}</td>
              <td>${c.description || ''}</td>
              <td style="color:var(--text-dim)">${c.firmware || '-'}</td>
              <td style="color:var(--text-dim)">${c.stream || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  async refresh() {
    const inputEl = this.el.querySelector('#input-cards-table');
    const outputEl = this.el.querySelector('#output-cards-table');
    const systemEl = this.el.querySelector('#system-cards-table');
    inputEl.innerHTML = '<div class="loading">Loading...</div>';

    try {
      const data = await api.getCards();
      const inputs = (data.cards || []).filter(c => c.role === 'input');
      const outputs = (data.cards || []).filter(c => c.role === 'output');
      const system = (data.cards || []).filter(c => c.role === 'system');

      inputEl.innerHTML = this._renderCardsTable(inputs);
      outputEl.innerHTML = this._renderCardsTable(outputs);
      systemEl.innerHTML = this._renderCardsTable(system);
    } catch (err) {
      inputEl.innerHTML = `<div class="error-msg">${err.message}</div>`;
    }
  }

  async loadDM(type) {
    const rawEl = this.el.querySelector('#dm-raw');
    rawEl.style.display = 'block';
    rawEl.textContent = 'Loading...';
    try {
      const fns = { topology: api.getTopology, endpoints: api.getEndpoints, streams: api.getStreams };
      const data = await fns[type]();
      rawEl.textContent = data.raw || JSON.stringify(data, null, 2);
    } catch (err) {
      rawEl.textContent = `Error: ${err.message}`;
    }
  }

  onShow() {
    this.refresh();
  }
}
