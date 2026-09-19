const express = require('express');
const { parseCards, parseEdid, parseHdcp } = require('../ctp/parser');
const { asyncHandler, requirePositiveInt, optionalPositiveInt, safeToken } = require('../http');

function createRouter(commandQueue, deviceCapabilities) {
  const router = express.Router();

  router.get('/cards', asyncHandler(async (req, res) => {
    if (deviceCapabilities) {
      const capabilities = await deviceCapabilities.get();
      res.json({
        cards: capabilities.cards,
        raw: capabilities.raw.cards,
        inputCount: capabilities.inputCount,
        outputCount: capabilities.outputCount,
        model: capabilities.model,
      });
      return;
    }

    const raw = await commandQueue.execute('CARDS', 10000);
    res.json(parseCards(raw));
  }));

  router.get('/edid', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('DMEDIDDisplay', 10000);
    res.json(parseEdid(raw));
  }));

  router.get('/edid/input/:port', asyncHandler(async (req, res) => {
    const port = requirePositiveInt(req.params.port, 'port');
    const raw = await commandQueue.execute(`EDIDINputinfo ${port}`, 10000);
    res.json({ port, raw });
  }));

  router.get('/edid/output/:port', asyncHandler(async (req, res) => {
    const port = requirePositiveInt(req.params.port, 'port');
    const raw = await commandQueue.execute(`EDIDOUTPUTinfo ${port}`, 10000);
    res.json({ port, raw });
  }));

  router.post('/edid/copy-tx', asyncHandler(async (req, res) => {
    const source = requirePositiveInt(req.body?.source, 'source');
    const destination = requirePositiveInt(req.body?.destination, 'destination');
    const raw = await commandQueue.execute(`COPYTXEDID ${source} ${destination}`);
    res.json({ success: true, raw });
  }));

  router.post('/edid/force', asyncHandler(async (req, res) => {
    const port = optionalPositiveInt(req.body?.port, 'port');
    const raw = await commandQueue.execute(`FORCESENTEDId${port ? ' ' + port : ''}`);
    res.json({ success: true, raw });
  }));

  router.post('/edid/force-default', asyncHandler(async (req, res) => {
    const port = optionalPositiveInt(req.body?.port, 'port');
    const raw = await commandQueue.execute(`FORCEDEFAULTEDID${port ? ' ' + port : ''}`);
    res.json({ success: true, raw });
  }));

  router.get('/edid/lockout', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('GETEDIDLOCKOUT');
    res.json({ raw });
  }));

  router.post('/edid/lockout', asyncHandler(async (req, res) => {
    const state = safeToken(req.body?.state, 'state');
    const raw = await commandQueue.execute(`SETEDIDLOCKOUT ${state}`);
    res.json({ success: true, raw });
  }));

  router.get('/hdcp', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('DMHDCPdisplay', 10000);
    res.json(parseHdcp(raw));
  }));

  router.get('/dm/topology', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('REPORTDMnet', 15000);
    res.json({ raw });
  }));

  router.get('/dm/endpoints', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('DMENDPOINTtype', 10000);
    res.json({ raw });
  }));

  router.get('/dm/streams', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('DUMPDMSTREaminfo', 10000);
    res.json({ raw });
  }));

  return router;
}

module.exports = createRouter;
