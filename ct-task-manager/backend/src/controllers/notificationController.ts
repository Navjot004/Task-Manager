import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification';

// ─── Helper: Create a notification ───────────────────────────
export const createNotification = async (
  recipientId: mongoose.Types.ObjectId | string,
  type: string,
  title: string,
  message: string,
  taskId?: mongoose.Types.ObjectId | string | null,
  triggeredById?: mongoose.Types.ObjectId | string | null
) => {
  try {
    // Don't notify yourself
    if (recipientId && triggeredById && recipientId.toString() === triggeredById.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      message,
      taskId: taskId || null,
      triggeredBy: triggeredById || null
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// ─── GET /api/notifications ──────────────────────────────────
// Fetch notifications for the current user (paginated)
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const filter = req.query.filter as string; // 'unread', 'tasks', 'chat'

    const query: any = { recipient: user._id };

    if (filter === 'unread') {
      query.isRead = false;
    } else if (filter === 'tasks') {
      query.type = { $nin: ['new_chat_message'] };
    } else if (filter === 'chat') {
      query.type = 'new_chat_message';
    }

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('triggeredBy', 'name role universityId department')
      .populate('taskId', 'taskId title status')
      .lean();

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error.' });
  }
};

// ─── GET /api/notifications/unread-count ─────────────────────
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const count = await Notification.countDocuments({ recipient: user._id, isRead: false });
    return res.status(200).json({ success: true, count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error.' });
  }
};

// ─── PATCH /api/notifications/:id/read ───────────────────────
export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    return res.status(200).json({ success: true, data: notification });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error.' });
  }
};

// ─── PATCH /api/notifications/read-all ───────────────────────
export const markAllNotificationsRead = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    await Notification.updateMany(
      { recipient: user._id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error.' });
  }
};
