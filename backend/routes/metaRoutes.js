const express = require('express');
const router = express.Router();
const metaController = require('../controllers/metaController');
const { requireRole } = require('../utils/actor');

router.get('/', metaController.getMeta);
router.get('/agents', requireRole('Supervisor', 'Admin'), metaController.getAgents);

module.exports = router;