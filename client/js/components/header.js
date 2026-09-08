import { api } from '../lib/api.js';
import { escapeHtml } from '../lib/ui.js';

export class Header {
  constructor(wsClient, onTabChange, onConnectionStateChange = null) {
    this.wsClient = wsClient;
    this.onTabChange = onTabChange;
    this.onConnectionStateChange = onConnectionStateChange;
    this.el = document.getElementById('header');
    this.activeTab = 'routing';
    this.connected = false;
    this.configured = false;
    this.transport = 'ctp';
    this._autoOpenedDrawer = false;

    this.tabs = [
      { id: 'routing', label: 'Routing', key: '1' },
      { id: 'status', label: 'Status', key: '2' },
      { id: 'edid', label: 'EDID', key: '3' },
      { id: 'hdcp', label: 'HDCP', key: '4' },
      { id: 'network', label: 'Network', key: '5' },
      { id: 'system', label: 'System', key: '6' },
      { id: 'terminal', label: 'Terminal', key: '7' },
    ];

    this.render();
    this.bindEvents();
    this.pollConnection();
  }

  render() {
    this.el.innerHTML = `
      <div class="header">
        <div class="header-left">
          <div class="connection-status" id="conn-status" aria-live="polite">
            <span class="connection-dot" id="conn-dot"></span>
            <span id="conn-label">Checking status...</span>
          </div>
          <button class="btn btn-ghost btn-sm" id="conn-settings-btn" aria-expanded="false" aria-controls="conn-settings">Connect</button>
        </div>
        <div class="brand">
          <span class="brand-mark">Matrix Switcher GUI</span>
        </div>
        <div class="header-right">
          <span class="device-chip" id="device-chip" hidden></span>
          <span class="queue-indicator" id="queue-indicator"></span>
        </div>
      </div>
      <div class="conn-drawer" id="conn-settings" hidden>
        <div class="conn-form">
          <div class="field">
            <label class="field-label" for="conn-transport">Transport</label>
            <select class="select" id="conn-transport">
              <option value="ctp">CTP</option>
              <option value="ssh">SSH</option>
            </select>
          </div>
          <div class="field">
            <label class="field-label" for="conn-host">Host</label>
            <input class="input input-host" type="text" id="conn-host" placeholder="switcher.local" autocomplete="off" spellcheck="false">
          </div>
          <div class="field">
            <label class="field-label" for="conn-port">Port</label>
            <input class="input input-port" type="number" id="conn-port" placeholder="41795">
          </div>
          <div class="field-group" id="conn-auth-fields" hidden>
            <div class="field">
              <label class="field-label" for="conn-username">Username</label>
              <input class="input input-user" type="text" id="conn-username" placeholder="admin" autocomplete="off" spellcheck="false">
            </div>
            <div class="field">
              <label class="field-label" for="conn-password">Password</label>
              <input class="input input-pass" type="password" id="conn-password" placeholder="optional" autocomplete="off">
            </div>
          </div>
          <button class="btn btn-primary" id="conn-go">Connect</button>
          <p class="conn-hint" id="conn-hint">CTP uses port 41795. CPU3 and newer controllers often require SSH on port 22.</p>
        </div>
      </div>
      <nav class="nav-tabs" id="nav-tabs" role="tablist" aria-label="Views">
        ${this.tabs.map((t) => `
          <button type="button" role="tab" id="tab-${t.id}" class="nav-tab ${t.id === this.activeTab ? 'active' : ''}"
                  data-tab="${t.id}" aria-controls="panel-${t.id}" aria-selected="${t.id === this.activeTab}"
                  tabindex="${t.id === this.activeTab ? '0' : '-1'}">
            <span>${t.label}</span><span class="shortcut" aria-hidden="true">^${t.key}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  bindEvents() {
    const navTabs = document.getElementById('nav-tabs');

    navTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.nav-tab');
      if (tab) this.setTab(tab.dataset.tab);
    });

    navTabs.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const step = e.key === 'ArrowRight' ? 1 : -1;
      const index = this.tabs.findIndex((t) => t.id === this.activeTab);
      const next = this.tabs[(index + step + this.tabs.length) % this.tabs.length];
      this.setTab(next.id);
      document.getElementById(`tab-${next.id}`)?.focus();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggleDrawer(false);
      // Don't capture shortcuts when typing in inputs or terminal
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= this.tabs.length) {
          e.preventDefault();
          this.setTab(this.tabs[num - 1].id);
        }
      }
    });

    document.getElementById('conn-settings-btn').addEventListener('click', () => {
      const drawer = document.getElementById('conn-settings');
      this.toggleDrawer(drawer.hidden);
    });

    document.getElementById('conn-go').addEventListener('click', () => this.doConnect());
    document.getElementById('conn-transport').addEventListener('change', (e) => {
      this.updateTransportFields(e.target.value);
    });

    ['conn-host', 'conn-port', 'conn-username', 'conn-password'].forEach((id) => {
      document.getElementById(id).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.doConnect();
      });
    });

    // WebSocket connection state
    this.wsClient.on('connection', (msg) => {
      this.applyConnectionState(msg);
    });
  }

  toggleDrawer(open) {
    const drawer = document.getElementById('conn-settings');
    const button = document.getElementById('conn-settings-btn');
    if (!drawer || !button) return;
    drawer.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? 'Hide' : 'Connect';
    if (open) document.getElementById('conn-host')?.focus();
  }

  async doConnect() {
    const transport = document.getElementById('conn-transport').value;
    const host = document.getElementById('conn-host').value.trim();
    const portValue = document.getElementById('conn-port').value.trim();
    const username = document.getElementById('conn-username')?.value.trim() || '';
    const password = document.getElementById('conn-password')?.value ?? '';
    const defaultPort = transport === 'ssh' ? 22 : 41795;
    if (!host) {
      window.app?.toast('Host required', 'error');
      document.getElementById('conn-host').focus();
      return;
    }
    if (transport === 'ssh' && !username) {
      window.app?.toast('SSH username required', 'error');
      document.getElementById('conn-username').focus();
      return;
    }

    const button = document.getElementById('conn-go');
    button.disabled = true;
    try {
      const selectedPort = portValue ? parseInt(portValue, 10) : defaultPort;
      const response = await api.connect({
        host,
        port: selectedPort,
        transport,
        username,
        password,
      });
      document.getElementById('conn-port').value = selectedPort;
      this.applyConnectionState({
        ...response,
        connected: false,
        prompt: null,
      });
      this.toggleDrawer(false);
      window.app?.toast(`Connecting via ${transport.toUpperCase()} to ${host}:${selectedPort}...`, 'info');
    } catch (err) {
      window.app?.toast(`Connect failed: ${err.message}`, 'error');
    } finally {
      button.disabled = false;
    }
  }

  applyConnectionState(data) {
    this.updateConnection(data.connected, data.prompt, data.configured, data.transport);
    this.onConnectionStateChange?.(data);

    const transportInput = document.getElementById('conn-transport');
    const hostInput = document.getElementById('conn-host');
    const portInput = document.getElementById('conn-port');
    const usernameInput = document.getElementById('conn-username');

    if (transportInput) {
      transportInput.value = data.transport || 'ctp';
      this.updateTransportFields(transportInput.value);
    }

    if (hostInput && !hostInput.value && data.host) hostInput.value = data.host;
    if (portInput && !portInput.value && data.port) portInput.value = data.port || 41795;
    if (usernameInput && !usernameInput.value && data.username) usernameInput.value = data.username;

    // First run with no configured device: surface the form instead of an empty UI.
    if (!data.configured && !this._autoOpenedDrawer) {
      this._autoOpenedDrawer = true;
      this.toggleDrawer(true);
    }
  }

  async pollConnection() {
    const poll = async () => {
      try {
        const data = await api.connection();
        this.applyConnectionState(data);
      } catch {}
    };
    await poll();
    setInterval(poll, 3000);
  }

  setTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-tab').forEach((el) => {
      const isActive = el.dataset.tab === tabId;
      el.classList.toggle('active', isActive);
      el.setAttribute('aria-selected', String(isActive));
      el.tabIndex = isActive ? 0 : -1;
    });
    this.onTabChange(tabId);
  }

  updateConnection(connected, prompt, configured = true, transport = 'ctp') {
    this.connected = connected;
    this.configured = configured;
    this.transport = transport || 'ctp';
    const dot = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    const status = document.getElementById('conn-status');
    if (!dot || !label) return;

    dot.classList.toggle('connected', connected);
    status?.classList.toggle('is-connected', Boolean(connected));
    status?.classList.toggle('is-offline', Boolean(configured) && !connected);

    if (!configured) {
      label.textContent = 'No switcher configured';
      return;
    }
    label.textContent = connected
      ? (prompt || `${this.transport.toUpperCase()} connected`)
      : `${this.transport.toUpperCase()} disconnected`;
  }

  setDeviceInfo(capabilities = {}) {
    const chip = document.getElementById('device-chip');
    if (!chip) return;

    const model = capabilities.model;
    const inputs = capabilities.inputCount || 0;
    const outputs = capabilities.outputCount || 0;

    if (!model && !inputs) {
      chip.hidden = true;
      chip.innerHTML = '';
      return;
    }

    const size = inputs && outputs ? `${inputs}&times;${outputs}` : '';
    chip.hidden = false;
    chip.innerHTML = [
      model ? `<strong>${escapeHtml(model)}</strong>` : '',
      size,
    ].filter(Boolean).join(' &middot; ');
  }

  updateTransportFields(transport) {
    const authFields = document.getElementById('conn-auth-fields');
    const portInput = document.getElementById('conn-port');
    if (!authFields || !portInput) return;

    const ssh = transport === 'ssh';
    authFields.hidden = !ssh;
    portInput.placeholder = ssh ? '22' : '41795';
  }
}
