const express = require('express');
const axios = require('axios');
const router = express.Router();

const OPENF1_BASE = 'https://api.openf1.org/v1';

router.get('/*', async (req, res) => {
  try {
    const path = req.params[0];
    const url = `${OPENF1_BASE}/races`;
    const response = await axios.get(url, { params: req.query });
    res.json(response.data);
  } catch (error) {
    console.error('OpenF1 proxy error:', error.message);
    res.status(500).json({ message: 'OpenF1 API proxy error', error: error.message });
  }
});

module.exports = router; 