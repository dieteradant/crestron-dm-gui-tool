const express = require('express');
const { parseNetwork } = require('../ctp/parser');

function createRouter(commandQueue) {
  const router = express.Router();

  router.get('/network', async (req, res) => {
    try {
      const raw = await commandQueue.execute('ESTatus', 10000);
      res.json(parseNetwork(raw));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
