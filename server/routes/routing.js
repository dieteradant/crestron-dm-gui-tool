const express = require('express');
const { parseRoutes } = require('../ctp/parser');

function createRouter(commandQueue, deviceCapabilities) {
  const router = express.Router();

  router.get('/routes', async (req, res) => {
    try {
      const capabilities = deviceCapabilities ? await deviceCapabilities.get() : null;
      const raw = await commandQueue.execute('DUMPDMROUTEInfo', 20000);
      res.json({
        ...parseRoutes(raw, capabilities || {}),
        raw,
        inputCount: capabilities?.inputCount || null,
        outputCount: capabilities?.outputCount || null,
        model: capabilities?.model || null,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/route/video', async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) return res.status(400).json({ error: 'input and output required' });
    try {
      const raw = await commandQueue.execute(`SETVIDEOROUTE ${input} ${output}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/route/audio', async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) return res.status(400).json({ error: 'input and output required' });
    try {
      const raw = await commandQueue.execute(`SETAUDIOROUTE ${input} ${output}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/route/usb', async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) return res.status(400).json({ error: 'input and output required' });
    try {
      const raw = await commandQueue.execute(`SETUSBROUTE ${input} ${output}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/route/av', async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) return res.status(400).json({ error: 'input and output required' });
    try {
      const raw = await commandQueue.execute(`SETAVROUTE ${input} ${output}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/route/avu', async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) return res.status(400).json({ error: 'input and output required' });
    try {
      const raw = await commandQueue.execute(`SETAVUROUTE ${input} ${output}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
