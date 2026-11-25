const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All notification endpoints require authenticated session
router.use(authenticate);

router.get('/', NotificationController.list);
router.get('/unread-count', NotificationController.unreadCount);
router.patch('/:id/read', NotificationController.markRead);
router.post('/read-all', NotificationController.markAllRead);
router.delete('/clear-all', NotificationController.clearAll);
router.delete('/:id', NotificationController.delete);

module.exports = router;
