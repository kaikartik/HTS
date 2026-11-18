const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const workflowController = require('../controllers/workflowController');
const { requireRole } = require('../utils/actor');

router.post('/', ticketController.createTicket);
router.get('/', ticketController.getTickets);
router.get('/:id', ticketController.getTicketById);

// Workflow: these need the x-user-id header (see utils/actor.js)
router.get('/:id/transitions', requireRole(), workflowController.getAllowedTransitions);
router.patch('/:id/status', requireRole(), workflowController.changeStatus);
router.post('/:id/assign', requireRole('Supervisor', 'Admin'), workflowController.assignTicket);
router.post('/:id/auto-assign', requireRole('Supervisor', 'Admin'), workflowController.autoAssignTicket);

module.exports = router;