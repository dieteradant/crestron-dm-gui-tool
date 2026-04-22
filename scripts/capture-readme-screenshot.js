const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:4010';
const OUTPUT_DIR = path.join(__dirname, '..', 'docs', 'assets');
const OUTPUT_PATHS = {
  routing: path.join(OUTPUT_DIR, 'app-screenshot.png'),
  status: path.join(OUTPUT_DIR, 'status-screenshot.png'),
  system: path.join(OUTPUT_DIR, 'system-screenshot.png')
};

const connectionState = {
  type: 'connection',
  connected: true,
  configured: true,
  host: 'demo-switch.local',
  port: 41795,
  prompt: 'DM-MD8x8>'
};

const routePayload = {
  video: { 1: 1, 2: 3, 3: 5, 4: 7, 5: 2, 6: 4, 7: 6, 8: 8 },
  audio: { 1: 1, 2: 3, 3: 5, 4: 7, 5: 2, 6: 4, 7: 6, 8: 8 },
  usb: { 1: 2, 2: 2, 3: 4, 4: 4, 5: 6, 6: 6, 7: 8, 8: 8 },
  raw: [
    'Routing Information for Output Card at Slot 17',
    'Video Routed From Input Card at slot 1',
    'Audio Routed From Input Card at slot 1',
    'Routing Information for Output Card at Slot 18',
    'Video Routed From Input Card at slot 3',
    'Audio Routed From Input Card at slot 3'
  ].join('\n')
};

const cardsPayload = {
  cards: [
    { slot: 1, type: 'DMC-4K-HD', description: 'HDMI 4K Input Card', firmware: '1.2911.00108', stream: 'b0.0', role: 'input', portNum: 1 },
    { slot: 2, type: 'DMC-4K-HD', description: 'HDMI 4K Input Card', firmware: '1.2911.00108', stream: 'b1.0', role: 'input', portNum: 2 },
    { slot: 3, type: 'DMC-4K-C', description: 'DM 8G+ Input Card', firmware: '1.2874.00042', stream: 'b2.0', role: 'input', portNum: 3 },
    { slot: 4, type: 'DMC-4K-C', description: 'DM 8G+ Input Card', firmware: '1.2874.00042', stream: 'b3.0', role: 'input', portNum: 4 },
    { slot: 17, type: 'DMC-4K-HD', description: 'HDMI 4K Output Card', firmware: '1.2911.00108', stream: 'c0.0', role: 'output', portNum: 1 },
    { slot: 18, type: 'DMC-4K-HD', description: 'HDMI 4K Output Card', firmware: '1.2911.00108', stream: 'c1.0', role: 'output', portNum: 2 },
    { slot: 19, type: 'DMC-4K-C', description: 'DM 8G+ Output Card', firmware: '1.2874.00042', stream: 'c2.0', role: 'output', portNum: 3 },
    { slot: 20, type: 'DMC-4K-C', description: 'DM 8G+ Output Card', firmware: '1.2874.00042', stream: 'c3.0', role: 'output', portNum: 4 },
    { slot: 33, type: 'CNTRL', description: 'Control Engine', firmware: '4.102.352400074', stream: null, role: 'system', portNum: null }
  ]
};

const versionPayload = {
  model: 'DM-MD8x8',
  firmware: '4.102.352400074 (Sep 23 2019)',
  serial: '00FFC818',
  info: [
    'Hostname: demo-switch.local',
    'IP: DHCP enabled',
    'CPU Temp: 38 C',
    'Fan State: normal'
  ].join('\n'),
  raw: 'DM-MD8x8 Cntrl Eng [v4.102.352400074 (Sep 23 2019), #00FFC818]'
};

const uptimePayload = {
  uptime: '12 days 04:21:33',
  raw: '12 days 04:21:33'
};

const errorsPayload = {
  entries: [
    'No active faults',
    'Fan speed nominal',
    'Temperature nominal'
  ],
  raw: [
    'Error Log',
    'No active faults',
    'Fan speed nominal',
    'Temperature nominal'
  ].join('\n')
};

async function updateQueueIndicator(page, text) {
  await page.evaluate((value) => {
    const queue = document.getElementById('queue-indicator');
    if (queue) queue.textContent = value;
  }, text);
}

async function captureRouting(page) {
  await page.click('.nav-tab[data-tab="routing"]');
  await page.waitForSelector('.matrix-cell.active');
  await updateQueueIndicator(page, '8x8 routing overview');
  await page.locator('#app').screenshot({ path: OUTPUT_PATHS.routing });
}

async function captureStatus(page) {
  await page.click('.nav-tab[data-tab="status"]');
  await page.waitForSelector('#input-cards-table .data-table');
  await updateQueueIndicator(page, 'card inventory and DM overview');
  await page.locator('#app').screenshot({ path: OUTPUT_PATHS.status });
}

async function captureSystem(page) {
  await page.click('.nav-tab[data-tab="system"]');
  await page.waitForSelector('#sys-info .info-item');
  await page.waitForSelector('#err-log');
  await updateQueueIndicator(page, 'system details and error log');
  await page.locator('#app').screenshot({ path: OUTPUT_PATHS.system });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 980 },
    colorScheme: 'dark',
    deviceScaleFactor: 1
  });

  await page.addInitScript((initialConnection) => {
    class FakeWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;

      constructor(url) {
        this.url = url;
        this.readyState = FakeWebSocket.CONNECTING;

        setTimeout(() => {
          this.readyState = FakeWebSocket.OPEN;
          if (this.onopen) this.onopen();
        }, 10);

        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({ data: JSON.stringify(initialConnection) });
          }
        }, 25);
      }

      send() {}

      close() {
        this.readyState = FakeWebSocket.CLOSED;
        if (this.onclose) this.onclose();
      }

      addEventListener(type, handler) {
        this[`on${type}`] = handler;
      }

      removeEventListener() {}
    }

    window.WebSocket = FakeWebSocket;
  }, connectionState);

  await page.route('**/api/connection', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(connectionState)
    });
  });

  await page.route('**/api/routes', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(routePayload)
    });
  });

  await page.route('**/api/cards', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(cardsPayload)
    });
  });

  await page.route('**/api/version', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(versionPayload)
    });
  });

  await page.route('**/api/uptime', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(uptimePayload)
    });
  });

  await page.route('**/api/errors', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(errorsPayload)
    });
  });

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await captureRouting(page);
  await captureStatus(page);
  await captureSystem(page);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
