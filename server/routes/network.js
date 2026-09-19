const express = require('express');
const { parseNetwork } = require('../ctp/parser');
const { asyncHandler } = require('../http');

function createRouter(commandQueue) {
  const router = express.Router();

  router.get('/network', asyncHandler(async (req, res) => {
    const raw = await commandQueue.execute('ESTatus', 10000);
    res.json(parseNetwork(raw));
  }));

  return router;
}

module.exports = createRouter;
