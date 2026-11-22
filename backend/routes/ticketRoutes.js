const express = require('express')
const router = express.Router()
const ticketController = require('../controllers/ticketController')
const workflowController = require('../controllers/workflowController')
const { requireRole } = require('../utils/actor')
const {
  authenticateToken,
  requireAgent
} = require('../middleware/authMiddleware')

// Existing & workflow routes
router.post('/', ticketController.createTicket)
router.get('/', ticketController.getTickets)

// Protected route — only authenticated Agents can access it (must be before /:id)
router.get(
  '/assigned',
  authenticateToken,
  requireAgent,
  ticketController.getAssignedTickets
)

router.get('/:id', ticketController.getTicketById)

// Workflow routes (require x-user-id header via utils/actor.js)
router.get('/:id/transitions', requireRole(), workflowController.getAllowedTransitions)
router.patch('/:id/status', requireRole(), workflowController.changeStatus)
router.post('/:id/assign', requireRole('Supervisor', 'Admin'), workflowController.assignTicket)
router.post('/:id/auto-assign', requireRole('Supervisor', 'Admin'), workflowController.autoAssignTicket)

module.exports = router
