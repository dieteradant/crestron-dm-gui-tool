import { WSClient } from './lib/ws.js';
import { Header } from './components/header.js';
import { RoutingMatrix } from './components/routing-matrix.js';
import { TerminalPanel } from './components/terminal.js';
import { StatusPanel } from './components/status-panel.js';
import { EdidPanel } from './components/edid-panel.js';
import { HdcpPanel } from './components/hdcp-panel.js';
import { NetworkPanel } from './components/network-panel.js';
import { SystemPanel } from './components/system-panel.js';
import { api } from './lib/api.js';

function createEmptyCapabilities() {
  return {
    model: null,
    inputCount: 0,
    outputCount: 0,
    outputSlotOffset: 0,
    cards: [],
  };
}

class App {
  constructor() {
    this.wsClient = new WSClient();
    this.activePanel = null;
    this.panels = {};
    this.connectionState = {
      connected: false,
      configured: false,
      host: '',
      port: 41795,
      transport: 'ctp',
      username: '',
      hasPassword: false,
      prompt: null,
    };
    this.deviceCapabilities = createEmptyCapabilities();
    this.capabilitiesKey = null;
    this.capabilitiesRequest = null;

    this.header = new Header(
      this.wsClient,
      (tabId) => this.switchPanel(tabId),
      (state) => this.handleConnectionState(state),
    );

    this.panels = {
      routing: new RoutingMatrix(this.deviceCapabilities),
      status: new StatusPanel(),
      edid: new EdidPanel(this.deviceCapabilities),
      hdcp: new HdcpPanel(),
      network: new NetworkPanel(),
      system: new SystemPanel(),
      terminal: new TerminalPanel(this.wsClient),
    };

    this.wsClient.connect();
    this.switchPanel('routing');
    this._createToastContainer();
  }

  switchPanel(tabId) {
    document.querySelectorAll('.panel').forEach((panel) => panel.classList.remove('active'));

    const panelEl = document.getElementById(`panel-${tabId}`);
    if (panelEl) panelEl.classList.add('active');

    this.activePanel = tabId;

    const panel = this.panels[tabId];
    if (panel?.onShow) panel.onShow();
  }

  handleConnectionState(state) {
    const previous = this.connectionState;
    const targetChanged = previous.host !== state.host
      || previous.port !== state.port
      || previous.transport !== state.transport
      || previous.username !== state.username
      || previous.configured !== state.configured;
    const becameConnected = state.connected && !previous.connected;
    const becameDisconnected = !state.connected && previous.connected;

    this.connectionState = {
      connected: Boolean(state.connected),
      configured: Boolean(state.configured),
      host: state.host || '',
      port: state.port || 41795,
      transport: state.transport || 'ctp',
      username: state.username || '',
      hasPassword: Boolean(state.hasPassword),
      prompt: state.prompt || null,
    };

    if (!this.connectionState.configured || targetChanged || becameDisconnected) {
      this.capabilitiesKey = null;
      this.applyCapabilities(null);
    }

    if (this.connectionState.connected && (becameConnected || targetChanged || !this.capabilitiesKey)) {
      this.loadCapabilities();
    }
  }

  applyCapabilities(capabilities) {
    this.deviceCapabilities = capabilities ? {
      model: capabilities.model || null,
      inputCount: capabilities.inputCount || 0,
      outputCount: capabilities.outputCount || 0,
      outputSlotOffset: capabilities.outputSlotOffset || 0,
      cards: capabilities.cards || [],
    } : createEmptyCapabilities();

    Object.values(this.panels).forEach((panel) => {
      if (typeof panel?.setCapabilities === 'function') {
        panel.setCapabilities(this.deviceCapabilities);
      }
    });
  }

  async loadCapabilities(forceRefresh = false) {
    if (!this.connectionState.connected) return;

    const key = `${this.connectionState.transport}:${this.connectionState.host}:${this.connectionState.port}`;
    if (!forceRefresh && this.capabilitiesKey === key && this.deviceCapabilities.inputCount > 0) {
      return;
    }

    if (this.capabilitiesRequest) {
      return this.capabilitiesRequest;
    }

    this.capabilitiesRequest = (async () => {
      try {
        const capabilities = await api.getCapabilities();
        this.capabilitiesKey = key;
        this.applyCapabilities(capabilities);
      } catch (err) {
        console.warn('Failed to load device capabilities', err);
      } finally {
        this.capabilitiesRequest = null;
      }
    })();

    return this.capabilitiesRequest;
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

document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
