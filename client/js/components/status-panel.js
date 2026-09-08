import { api } from '../lib/api.js';
import { escapeHtml, emptyState, errorState, skeletonRows } from '../lib/ui.js';

export class StatusPanel {
  constructor() {
    this.el = document.getElementById('panel-status');
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">Card Inventory</span>
          <button class="btn btn-secondary btn-sm" id="status-refresh">Refresh</button>
        </div>
        <div class="section-subtitle">Input cards</div>
        <div id="input-cards-table">${skeletonRows(3)}</div>
        <div class="section-subtitle" style="margin-top:16px;">Output cards</div>
        <div id="output-cards-table">${skeletonRows(3)}</div>
        <div class="section-subtitle" style="margin-top:16px;">System cards</div>
        <div id="system-cards-table">${skeletonRows(2)}</div>
      </div>
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">DM Info</span>
          <div class="btn-row">
            <button class="btn btn-secondary btn-sm" id="topology-refresh">Topology</button>
            <button class="btn btn-secondary btn-sm" id="endpoints-refresh">Endpoints</button>
            <button class="btn btn-secondary btn-sm" id="streams-refresh">Streams</button>
          </div>
        </div>
        <div class="raw-output" id="dm-raw" hidden></div>
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
    if (!cards.length) return emptyState('No cards detected');
    return `
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Slot</th><th>Port</th><th>Type</th><th>Description</th><th>Firmware</th><th>Stream</th></tr></thead>
          <tbody>
            ${cards.map((c) => `
              <tr>
                <td>${escapeHtml(c.slot)}</td>
                <td>${escapeHtml(c.portNum ?? '-')}</td>
                <td class="cell-strong">${escapeHtml(c.type)}</td>
                <td>${escapeHtml(c.description || '')}</td>
                <td class="cell-dim">${escapeHtml(c.firmware || '-')}</td>
                <td class="cell-dim">${escapeHtml(c.stream || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async refresh() {
    const inputEl = this.el.querySelector('#input-cards-table');
    const outputEl = this.el.querySelector('#output-cards-table');
    const systemEl = this.el.querySelector('#system-cards-table');
    inputEl.innerHTML = skeletonRows(3);
    outputEl.innerHTML = skeletonRows(3);
    systemEl.innerHTML = skeletonRows(2);

    try {
      const data = await api.getCards();
      const cards = data.cards || [];

      inputEl.innerHTML = this._renderCardsTable(cards.filter((c) => c.role === 'input'));
      outputEl.innerHTML = this._renderCardsTable(cards.filter((c) => c.role === 'output'));
      systemEl.innerHTML = this._renderCardsTable(cards.filter((c) => c.role === 'system'));
    } catch (err) {
      inputEl.innerHTML = errorState(err.message);
      outputEl.innerHTML = '';
      systemEl.innerHTML = '';
    }
  }

  async loadDM(type) {
    const rawEl = this.el.querySelector('#dm-raw');
    rawEl.hidden = false;
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
