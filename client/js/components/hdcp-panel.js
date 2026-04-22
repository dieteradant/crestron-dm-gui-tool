import { api } from '../lib/api.js';

export class HdcpPanel {
  constructor() {
    this.el = document.getElementById('panel-hdcp');
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="panel-section">
        <div class="section-header">
          <span class="section-title">HDCP Status</span>
          <button class="btn btn-secondary btn-sm" id="hdcp-refresh">Refresh</button>
        </div>
        <div class="raw-output" id="hdcp-output">Loading...</div>
      </div>
    `;
    this.el.querySelector('#hdcp-refresh').addEventListener('click', () => this.refresh());
  }

  async refresh() {
    const output = this.el.querySelector('#hdcp-output');
    output.textContent = 'Loading...';
    try {
      const data = await api.getHdcp();
      output.textContent = data.raw || JSON.stringify(data, null, 2);
    } catch (err) {
      output.textContent = `Error: ${err.message}`;
    }
  }

  onShow() {
    this.refresh();
  }
}
