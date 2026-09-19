const express = require('express');
const { parseRoutes } = require('../ctp/parser');
const { httpError, asyncHandler } = require('../http');

function createRouter(commandQueue, deviceCapabilities) {
  const router = express.Router();

  router.get('/routes', asyncHandler(async (req, res) => {
    const capabilities = deviceCapabilities ? await deviceCapabilities.get() : null;
    const raw = await commandQueue.execute('DUMPDMROUTEInfo', 20000);
    res.json({
      ...parseRoutes(raw, capabilities || {}),
      raw,
      inputCount: capabilities?.inputCount || null,
      outputCount: capabilities?.outputCount || null,
      model: capabilities?.model || null,
    });
  }));

  router.post('/route/video', asyncHandler(async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) throw httpError(400, 'input and output required');
    const raw = await commandQueue.execute(`SETVIDEOROUTE ${input} ${output}`);
    res.json({ success: true, raw });
  }));

  router.post('/route/audio', asyncHandler(async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) throw httpError(400, 'input and output required');
    const raw = await commandQueue.execute(`SETAUDIOROUTE ${input} ${output}`);
    res.json({ success: true, raw });
  }));

  router.post('/route/usb', asyncHandler(async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) throw httpError(400, 'input and output required');
    const raw = await commandQueue.execute(`SETUSBROUTE ${input} ${output}`);
    res.json({ success: true, raw });
  }));

  router.post('/route/av', asyncHandler(async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) throw httpError(400, 'input and output required');
    const raw = await commandQueue.execute(`SETAVROUTE ${input} ${output}`);
    res.json({ success: true, raw });
  }));

  router.post('/route/avu', asyncHandler(async (req, res) => {
    const { input, output } = req.body;
    if (!input || !output) throw httpError(400, 'input and output required');
    const raw = await commandQueue.execute(`SETAVUROUTE ${input} ${output}`);
    res.json({ success: true, raw });
  }));

  return router;
}

module.exports = createRouter;
