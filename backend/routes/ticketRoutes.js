
const express = require('express');
const router = express.Router();

const ticketController = require('../controllers/ticketController');
const {
    authenticateToken,
    requireAgent
} = require('../middleware/authMiddleware');

// Existing routes — preserved for the other HTS modules
router.post('/', ticketController.createTicket);
router.get('/', ticketController.getTickets);

// Protected route — only authenticated Agents can access it
router.get(
    '/assigned',
    authenticateToken,
    requireAgent,
    ticketController.getAssignedTickets
);

module.exports = router;
