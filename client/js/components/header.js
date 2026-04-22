import { api } from '../lib/api.js';

export class Header {
  constructor(wsClient, onTabChange) {
    this.wsClient = wsClient;
    this.onTabChange = onTabChange;
    this.el = document.getElementById('header');
    this.activeTab = 'routing';
    this.connected = false;

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
          <div class="connection-status">
            <span class="connection-dot" id="conn-dot"></span>
            <span id="conn-label">Connecting...</span>
          </div>
          <button class="btn btn-secondary btn-sm" id="conn-settings-btn" style="font-size:11px;padding:2px 8px;">Connect</button>
        </div>
        <div class="header-title">DM Switcher GUI</div>
        <div class="queue-indicator" id="queue-indicator"></div>
      </div>
      <div id="conn-settings" style="display:none;background:var(--bg-secondary);border-bottom:1px solid var(--border);padding:8px 16px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <label style="font-size:12px;color:var(--text-secondary);">Host:</label>
          <input type="text" id="conn-host" placeholder="192.168.99.194" style="background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);padding:4px 8px;border-radius:3px;font-family:var(--font-mono);font-size:13px;width:180px;">
          <label style="font-size:12px;color:var(--text-secondary);">Port:</label>
          <input type="number" id="conn-port" placeholder="41795" style="background:var(--bg-input);color:var(--text-primary);border:1px solid var(--border);padding:4px 8px;border-radius:3px;font-family:var(--font-mono);font-size:13px;width:80px;">
          <button class="btn btn-primary btn-sm" id="conn-go">Connect</button>
        </div>
      </div>
      <nav class="nav-tabs" id="nav-tabs">
        ${this.tabs.map(t => `
          <div class="nav-tab ${t.id === this.activeTab ? 'active' : ''}" data-tab="${t.id}">
            ${t.label}<span class="shortcut">^${t.key}</span>
          </div>
        `).join('')}
      </nav>
    `;
  }

  bindEvents() {
    document.getElementById('nav-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('.nav-tab');
      if (tab) this.setTab(tab.dataset.tab);
    });

    document.addEventListener('keydown', (e) => {
      // Don't capture shortcuts when typing in inputs or terminal
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= this.tabs.length) {
          e.preventDefault();
          this.setTab(this.tabs[num - 1].id);
        }
      }
    });

    // Connection settings toggle
    document.getElementById('conn-settings-btn').addEventListener('click', () => {
      const panel = document.getElementById('conn-settings');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    // Connect button
    document.getElementById('conn-go').addEventListener('click', () => this.doConnect());
    document.getElementById('conn-host').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.doConnect();
    });

    // WebSocket connection state
    this.wsClient.on('connection', (msg) => {
      this.updateConnection(msg.connected, msg.prompt);
    });
  }

  async doConnect() {
    const host = document.getElementById('conn-host').value.trim();
    const port = document.getElementById('conn-port').value.trim();
    if (!host) return;
    try {
      await api.connect(host, port ? parseInt(port) : 41795);
      document.getElementById('conn-settings').style.display = 'none';
      window.app?.toast(`Connecting to ${host}...`, 'info');
    } catch (err) {
      window.app?.toast(`Connect failed: ${err.message}`, 'error');
    }
  }

  async pollConnection() {
    try {
      const data = await api.connection();
      this.updateConnection(data.connected, data.prompt);
      // Fill in current host/port
      const hostInput = document.getElementById('conn-host');
      const portInput = document.getElementById('conn-port');
      if (hostInput && !hostInput.value) hostInput.value = data.host || '';
      if (portInput && !portInput.value) portInput.value = data.port || 41795;
    } catch {}
    // Poll every 3 seconds
    setInterval(async () => {
      try {
        const data = await api.connection();
        this.updateConnection(data.connected, data.prompt);
      } catch {}
    }, 3000);
  }

  setTab(tabId) {
    this.activeTab = tabId;
    document.querySelectorAll('.nav-tab').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tabId);
    });
    this.onTabChange(tabId);
  }

  updateConnection(connected, prompt) {
    this.connected = connected;
    const dot = document.getElementById('conn-dot');
    const label = document.getElementById('conn-label');
    if (!dot || !label) return;
    dot.classList.toggle('connected', connected);
    label.textContent = connected ? (prompt || 'Connected') : 'Disconnected';
  }
}
