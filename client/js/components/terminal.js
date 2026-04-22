export class TerminalPanel {
  constructor(wsClient) {
    this.wsClient = wsClient;
    this.el = document.getElementById('panel-terminal');
    this.term = null;
    this.fitAddon = null;
    this._initialized = false;
    this._bufferedOutput = [];
  }

  async init() {
    if (this._initialized) return;
    this._initialized = true;

    this.el.innerHTML = `
      <div class="terminal-panel">
        <div class="terminal-container" id="terminal-container"></div>
      </div>
    `;

    // Buffer terminal output while loading xterm
    const bufferHandler = this.wsClient.on('terminal', (msg) => {
      this._bufferedOutput.push(msg.data);
    });

    await this._loadXterm();

    this.term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Consolas', monospace",
      theme: {
        background: '#0a0a1a',
        foreground: '#eee',
        cursor: '#e94560',
        selectionBackground: 'rgba(233,69,96,0.3)',
      },
      scrollback: 10000,
    });

    this.fitAddon = new FitAddon.FitAddon();
    this.term.loadAddon(this.fitAddon);
    this.term.open(document.getElementById('terminal-container'));

    // Small delay to ensure DOM is ready for fit
    requestAnimationFrame(() => {
      try { this.fitAddon.fit(); } catch {}
    });

    // Remove buffer handler, set up real handler
    bufferHandler();

    // Write any buffered output
    for (const data of this._bufferedOutput) {
      this.term.write(data);
    }
    this._bufferedOutput = [];

    // Handle terminal input — send each keystroke to CTP
    this.term.onData((data) => {
      this.wsClient.sendTerminal(data);
    });

    // Handle terminal output from CTP
    this.wsClient.on('terminal', (msg) => {
      if (this.term) this.term.write(msg.data);
    });

    // Subscribe for terminal data
    this.wsClient.send({ type: 'terminal-subscribe' });

    // Resize handler
    this._resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try { this.fitAddon.fit(); } catch {}
      });
    });
    this._resizeObserver.observe(document.getElementById('terminal-container'));
  }

  async _loadXterm() {
    if (window.Terminal) return;

    const loadCSS = (href) => {
      return new Promise((resolve) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = resolve;
        document.head.appendChild(link);
      });
    };

    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    };

    await loadCSS('https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/css/xterm.min.css');
    await loadScript('https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0/lib/xterm.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.min.js');
  }

  onShow() {
    this.init();
    if (this.fitAddon) {
      requestAnimationFrame(() => {
        try { this.fitAddon.fit(); } catch {}
      });
    }
    if (this.term) this.term.focus();
  }
}
