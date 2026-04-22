const path = require('path');
const { chromium } = require('playwright');

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:4010';
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'assets', 'app-screenshot.png');

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

  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.matrix-cell.active');

  await page.evaluate(() => {
    const queue = document.getElementById('queue-indicator');
    if (queue) queue.textContent = '8x8 routing overview';
  });

  await page.screenshot({ path: OUTPUT_PATH });
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
