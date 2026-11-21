const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { requireRole } = require('../utils/actor');

router.get('/', requireRole(), notificationController.getMyNotifications);
router.post('/read-all', requireRole(), notificationController.markAllRead);
router.patch('/:id/read', requireRole(), notificationController.markRead);

module.exports = router;