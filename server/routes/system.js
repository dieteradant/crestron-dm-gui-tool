const express = require('express');
const { parseVersion, parseErrLog, parseUptime, parseMemory, parseTop } = require('../ctp/parser');

function createRouter(commandQueue) {
  const router = express.Router();

  router.get('/version', async (req, res) => {
    try {
      const [verRaw, infoRaw] = await commandQueue.executeBatch(['VER', 'INFO'], 5000);
      const parsed = parseVersion(verRaw);
      parsed.info = infoRaw;
      res.json(parsed);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/uptime', async (req, res) => {
    try {
      const raw = await commandQueue.execute('UPTIME');
      res.json(parseUptime(raw));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/errors', async (req, res) => {
    try {
      const raw = await commandQueue.execute('ERRlog', 10000);
      res.json(parseErrLog(raw));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/errors/clear', async (req, res) => {
    try {
      const raw = await commandQueue.execute('CLEARerr');
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/system/memory', async (req, res) => {
    try {
      const [freeRaw, heapRaw] = await commandQueue.executeBatch(['FREE', 'HEAPfree'], 5000);
      res.json({ free: freeRaw, heap: heapRaw, raw: freeRaw + '\n' + heapRaw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/system/top', async (req, res) => {
    try {
      const raw = await commandQueue.execute('TOP', 10000);
      res.json(parseTop(raw));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/system/reboot', async (req, res) => {
    if (!req.body.confirm) {
      return res.status(400).json({ error: 'Must include confirm: true to reboot' });
    }
    try {
      const raw = await commandQueue.execute('REBOOT', 3000);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/fp-lockout', async (req, res) => {
    try {
      const raw = await commandQueue.execute('GETFPLOCKOUT');
      res.json({ raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/fp-lockout', async (req, res) => {
    const { state } = req.body;
    try {
      const raw = await commandQueue.execute(`SETFPLOCKOUT ${state}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
