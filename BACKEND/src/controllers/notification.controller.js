const NotificationService = require('../services/notification.service');

/**
 * Controller for notification endpoints
 */
class NotificationController {
  /**
   * GET /api/v1/notifications
   * List notifications for authenticated user
   */
  static async list(req, res, next) {
    try {
      const limit = req.query.size ? parseInt(req.query.size, 10) : undefined;
      const notifications = await NotificationService.listNotificationsForUser(req.user, { limit });
      return res.status(200).json(notifications);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/v1/notifications/unread-count
   * Get unread notifications count
   */
  static async unreadCount(req, res, next) {
    try {
      const result = await NotificationService.getUnreadCountForUser(req.user);
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   * Mark single notification as read
   */
  static async markRead(req, res, next) {
    try {
      const { id } = req.params;
      const notification = await NotificationService.markAsRead(id, req.user);
      if (!notification) {
        return res.status(404).json({
          status: 'error',
          message: 'Notification not found or access denied.'
        });
      }
      return res.status(200).json(notification);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/v1/notifications/read-all
   * Mark all notifications as read
   */
  static async markAllRead(req, res, next) {
    try {
      const result = await NotificationService.markAllAsRead(req.user);
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }

  /**
   * DELETE /api/v1/notifications/:id
   * Delete single notification
   */
  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const success = await NotificationService.deleteNotification(id, req.user);
      if (!success) {
        return res.status(404).json({
          status: 'error',
          message: 'Notification not found or access denied.'
        });
      }
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }

  /**
   * DELETE /api/v1/notifications/clear-all
   * Clear all notifications
   */
  static async clearAll(req, res, next) {
    try {
      await NotificationService.clearAllNotifications(req.user);
      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = NotificationController;
