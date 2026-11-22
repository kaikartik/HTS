// Agent Workspace routes  (owner: Kanishka Sharma)
// Mounted at /api/agent in server.js. Every route requires a valid JWT
// and the Agent role (role_id 2).
const express = require('express');
const router = express.Router();

const agent = require('../controllers/agentController');
const { authenticateToken, requireAgent } = require('../middleware/authMiddleware');

router.use(authenticateToken, requireAgent);

// Profile
router.get('/me', agent.getMe);

// Ticket queue + detail
router.get('/tickets', agent.getQueue);
router.post('/tickets', agent.createTicketForRequester); // raise on behalf of a requester
router.get('/tickets/:id', agent.getTicketDetail);

// Assignment
router.post('/tickets/:id/claim', agent.claimTicket);
router.post('/tickets/:id/release', agent.releaseTicket);

// Conversation (public reply / private note)
router.post('/tickets/:id/comments', agent.addComment);

// Workflow
router.patch('/tickets/:id/status', agent.updateStatus);
router.patch('/tickets/:id/priority', agent.updatePriority);

// Attachments
router.get('/attachments/:id/download', agent.downloadAttachment);

// In-app notifications
router.get('/notifications', agent.getNotifications);
router.post('/notifications/read', agent.markNotificationsRead);

// Knowledge base
router.get('/categories', agent.getCategories);
router.get('/kb', agent.listArticles);
router.post('/kb', agent.createArticle);
router.get('/kb/:id', agent.getArticle);
router.put('/kb/:id', agent.updateArticle);
router.post('/tickets/:id/kb-draft', agent.createDraftFromTicket);

module.exports = router;
