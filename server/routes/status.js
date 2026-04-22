const express = require('express');
const { parseCards, parseEdid, parseHdcp } = require('../ctp/parser');

function createRouter(commandQueue) {
  const router = express.Router();

  router.get('/cards', async (req, res) => {
    try {
      const raw = await commandQueue.execute('CARDS', 10000);
      res.json(parseCards(raw));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/edid', async (req, res) => {
    try {
      const raw = await commandQueue.execute('DMEDIDDisplay', 10000);
      res.json(parseEdid(raw));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/edid/input/:port', async (req, res) => {
    try {
      const raw = await commandQueue.execute(`EDIDINputinfo ${req.params.port}`, 10000);
      res.json({ port: req.params.port, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/edid/output/:port', async (req, res) => {
    try {
      const raw = await commandQueue.execute(`EDIDOUTPUTinfo ${req.params.port}`, 10000);
      res.json({ port: req.params.port, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/edid/copy-tx', async (req, res) => {
    const { source, destination } = req.body;
    if (!source || !destination) return res.status(400).json({ error: 'source and destination required' });
    try {
      const raw = await commandQueue.execute(`COPYTXEDID ${source} ${destination}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/edid/force', async (req, res) => {
    const { port } = req.body;
    try {
      const raw = await commandQueue.execute(`FORCESENTEDId${port ? ' ' + port : ''}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/edid/force-default', async (req, res) => {
    const { port } = req.body;
    try {
      const raw = await commandQueue.execute(`FORCEDEFAULTEDID${port ? ' ' + port : ''}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/edid/lockout', async (req, res) => {
    try {
      const raw = await commandQueue.execute('GETEDIDLOCKOUT');
      res.json({ raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/edid/lockout', async (req, res) => {
    const { state } = req.body;
    try {
      const raw = await commandQueue.execute(`SETEDIDLOCKOUT ${state}`);
      res.json({ success: true, raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/hdcp', async (req, res) => {
    try {
      const raw = await commandQueue.execute('DMHDCPdisplay', 10000);
      res.json(parseHdcp(raw));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/dm/topology', async (req, res) => {
    try {
      const raw = await commandQueue.execute('REPORTDMnet', 15000);
      res.json({ raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/dm/endpoints', async (req, res) => {
    try {
      const raw = await commandQueue.execute('DMENDPOINTtype', 10000);
      res.json({ raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/dm/streams', async (req, res) => {
    try {
      const raw = await commandQueue.execute('DUMPDMSTREaminfo', 10000);
      res.json({ raw });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = createRouter;
