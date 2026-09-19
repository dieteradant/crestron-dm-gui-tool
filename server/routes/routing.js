const express = require('express');
const { parseRoutes } = require('../ctp/parser');
const { httpError, asyncHandler, requirePositiveInt } = require('../http');

const ROUTE_COMMANDS = Object.freeze({
  video: 'SETVIDEOROUTE',
  audio: 'SETAUDIOROUTE',
  usb: 'SETUSBROUTE',
  av: 'SETAVROUTE',
  avu: 'SETAVUROUTE',
});

function validatePortRange(label, value, max, maxLabel) {
  if (Number.isInteger(max) && max > 0 && value > max) {
    throw httpError(400, `${label} ${value} is out of range (device has ${max} ${maxLabel})`);
  }
}

function createRouter(commandQueue, deviceCapabilities) {
  const router = express.Router();

  router.get('/routes', asyncHandler(async (req, res) => {
    const capabilities = deviceCapabilities ? await deviceCapabilities.get() : null;
    const result = await commandQueue.executeDetailed('DUMPDMROUTEInfo', 20000);
    res.json({
      ...parseRoutes(result.raw, capabilities || {}),
      raw: result.raw,
      // The queue resolves with partial data on timeout/disconnect so the
      // client can flag the grid as possibly incomplete.
      timedOut: result.timedOut || result.disconnected || false,
      inputCount: capabilities?.inputCount || null,
      outputCount: capabilities?.outputCount || null,
      model: capabilities?.model || null,
    });
  }));

  for (const [mode, command] of Object.entries(ROUTE_COMMANDS)) {
    router.post(`/route/${mode}`, asyncHandler(async (req, res) => {
      const input = requirePositiveInt(req.body?.input, 'input');
      const output = requirePositiveInt(req.body?.output, 'output');

      const cached = deviceCapabilities?.getCached();
      if (cached) {
        validatePortRange('input', input, cached.inputCount, 'inputs');
        validatePortRange('output', output, cached.outputCount, 'outputs');
      }

      const raw = await commandQueue.execute(`${command} ${input} ${output}`);
      res.json({ success: true, raw });
    }));
  }

  return router;
}

module.exports = createRouter;
