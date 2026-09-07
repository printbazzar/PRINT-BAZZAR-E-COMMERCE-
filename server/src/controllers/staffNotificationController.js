import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Dispatch internal staff notification
 * Stores in database and logs transaction
 */
export async function createStaffNotification({
  userId = null,
  department = null,
  title,
  message,
  type,
  orderId = null,
  productionJobId = null,
  metadata = null,
}) {
  try {
    const notif = await prisma.staffNotification.create({
      data: {
        userId,
        department,
        title,
        message,
        type,
        orderId,
        productionJobId,
        metadataJson: metadata ? JSON.stringify(metadata) : null,
      },
    });
    return notif;
  } catch (err) {
    console.error('Error creating staff notification:', err);
    return null;
  }
}

// GET /api/v1/admin/staff-notifications
export const getStaffNotifications = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userDept = (req.user?.department || 'ALL').toUpperCase();
    const isSuperAdmin = (req.user?.role?.name || req.user?.role || '').toLowerCase().includes('super');

    const where = {
      OR: [
        ...(userId ? [{ userId }] : []),
        ...(userDept && userDept !== 'ALL' ? [{ department: userDept }] : []),
        { department: 'ALL' },
        ...(isSuperAdmin ? [{ department: null }] : []),
      ],
    };

    const notifications = await prisma.staffNotification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        order: { select: { orderNumber: true, customerName: true } },
        productionJob: { select: { jobNumber: true, priority: true } },
      },
    });

    const unreadCount = await prisma.staffNotification.count({
      where: {
        ...where,
        isRead: false,
      },
    });

    return res.json({
      success: true,
      unreadCount,
      notifications,
    });
  } catch (err) {
    console.error('getStaffNotifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch staff notifications.' });
  }
};

// PATCH /api/v1/admin/staff-notifications/:id/read
export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await prisma.staffNotification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return res.json({ success: true, notification: notif });
  } catch (err) {
    console.error('markNotificationRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
};

// POST /api/v1/admin/staff-notifications/mark-all-read
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userDept = (req.user?.department || 'ALL').toUpperCase();

    await prisma.staffNotification.updateMany({
      where: {
        OR: [
          ...(userId ? [{ userId }] : []),
          ...(userDept && userDept !== 'ALL' ? [{ department: userDept }] : []),
          { department: 'ALL' },
        ],
        isRead: false,
      },
      data: { isRead: true, readAt: new Date() },
    });

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('markAllNotificationsRead error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark all notifications as read.' });
  }
};
