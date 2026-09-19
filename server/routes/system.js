const express = require('express');
const { parseVersion, parseErrLog, parseUptime, parseTop } = require('../ctp/parser');
const { httpError, asyncHandler, safeToken } = require('../http');

function createRouter(commandQueue) {
  const router = express.Router();

  router.get('/version', asyncHandler(async (req, res) => {
    const [verRaw, infoRaw] = await commandQueue.executeBatch(['VER', 'INFO'], 5000);
    const parsed = parseVersion(verRaw);
    parsed.info = infoRaw;
    res.json(parsed);
  }));

  router.get('/uptime', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('UPTIME');
    res.json(parseUptime(raw));
  }));

  router.get('/errors', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('ERRlog', 10000);
    res.json(parseErrLog(raw));
  }));

  router.post('/errors/clear', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('CLEARerr');
    res.json({ success: true, raw });
  }));

  router.get('/system/memory', asyncHandler(async (req, res) => {
    const [freeRaw, heapRaw] = await commandQueue.executeBatch(['FREE', 'HEAPfree'], 5000);
    res.json({ free: freeRaw, heap: heapRaw, raw: freeRaw + '\n' + heapRaw });
  }));

  router.get('/system/top', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('TOP', 10000);
    res.json(parseTop(raw));
  }));

  router.post('/system/reboot', asyncHandler(async (req, res) => {
    if (!req.body?.confirm) {
      throw httpError(400, 'Must include confirm: true to reboot');
    }
    const raw = await commandQueue.execute('REBOOT', 3000);
    res.json({ success: true, raw });
  }));

  router.get('/fp-lockout', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('GETFPLOCKOUT');
    res.json({ raw });
  }));

  router.post('/fp-lockout', asyncHandler(async (req, res) => {
    const state = safeToken(req.body?.state, 'state');
    const raw = await commandQueue.execute(`SETFPLOCKOUT ${state}`);
    res.json({ success: true, raw });
  }));

  return router;
}

module.exports = createRouter;
