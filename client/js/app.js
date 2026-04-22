import { WSClient } from './lib/ws.js';
import { Header } from './components/header.js';
import { RoutingMatrix } from './components/routing-matrix.js';
import { TerminalPanel } from './components/terminal.js';
import { StatusPanel } from './components/status-panel.js';
import { EdidPanel } from './components/edid-panel.js';
import { HdcpPanel } from './components/hdcp-panel.js';
import { NetworkPanel } from './components/network-panel.js';
import { SystemPanel } from './components/system-panel.js';

class App {
  constructor() {
    this.wsClient = new WSClient();
    this.activePanel = null;
    this.panels = {};

    // Initialize header with tab handler
    this.header = new Header(this.wsClient, (tabId) => this.switchPanel(tabId));

    // Initialize panels
    this.panels = {
      routing: new RoutingMatrix(),
      status: new StatusPanel(),
      edid: new EdidPanel(),
      hdcp: new HdcpPanel(),
      network: new NetworkPanel(),
      system: new SystemPanel(),
      terminal: new TerminalPanel(this.wsClient),
    };

    // Connect WebSocket
    this.wsClient.connect();

    // Show default panel
    this.switchPanel('routing');

    // Toast container
    this._createToastContainer();
  }

  switchPanel(tabId) {
    // Hide all panels
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    // Show selected panel
    const panelEl = document.getElementById(`panel-${tabId}`);
    if (panelEl) panelEl.classList.add('active');

    this.activePanel = tabId;

    // Notify panel
    const panel = this.panels[tabId];
    if (panel?.onShow) panel.onShow();
  }

  _createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }
}

// Boot
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
