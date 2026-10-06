import { prisma } from "../../lib/prisma";
import {
  ICreateNotificationPayload,
  IGetNotificationsQuery,
} from "./notification.interface";

const createNotificationInDB = async (payload: ICreateNotificationPayload) => {
  // Don't notify oneself
  if (payload.recipientId === payload.senderId) {
    return null;
  }

  // Avoid duplicate unread notification of same type from same sender for same link within last hour
  const recentDuplicate = await prisma.notification.findFirst({
    where: {
      recipientId: payload.recipientId,
      senderId: payload.senderId,
      type: payload.type,
      link: payload.link,
      isRead: false,
    },
  });

  if (recentDuplicate) {
    // Update the timestamp of the existing unread notification
    return await prisma.notification.update({
      where: { id: recentDuplicate.id },
      data: {
        message: payload.message,
        createdAt: new Date(),
      },
    });
  }

  const notification = await prisma.notification.create({
    data: {
      recipientId: payload.recipientId,
      senderId: payload.senderId,
      type: payload.type,
      message: payload.message,
      link: payload.link,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          profilePhoto: true,
        },
      },
    },
  });

  return notification;
};

const getMyNotificationsFromDB = async (
  userId: string,
  query?: IGetNotificationsQuery
) => {
  const page = Math.max(Number(query?.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query?.limit) || 15, 1), 50);
  const skip = (page - 1) * limit;

  const where: any = {
    recipientId: userId,
  };

  if (query?.unreadOnly === "true") {
    where.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            profilePhoto: true,
            role: true,
            accountType: true,
          },
        },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    }),
  ]);

  return {
    notifications,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      unreadCount,
    },
  };
};

const getUnreadCountFromDB = async (userId: string) => {
  const count = await prisma.notification.count({
    where: {
      recipientId: userId,
      isRead: false,
    },
  });

  return { unreadCount: count };
};

const markNotificationAsReadInDB = async (
  notificationId: string,
  userId: string
) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.recipientId !== userId) {
    throw new Error("Notification not found or unauthorized.");
  }

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updated;
};

const markAllNotificationsAsReadInDB = async (userId: string) => {
  const result = await prisma.notification.updateMany({
    where: {
      recipientId: userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return { count: result.count };
};

export const notificationService = {
  createNotificationInDB,
  getMyNotificationsFromDB,
  getUnreadCountFromDB,
  markNotificationAsReadInDB,
  markAllNotificationsAsReadInDB,
};
