import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { notificationService } from "./notification.service";
import { IGetNotificationsQuery } from "./notification.interface";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const query = req.query as IGetNotificationsQuery;

  const result = await notificationService.getMyNotificationsFromDB(
    userId,
    query
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Notifications retrieved successfully",
    data: result.notifications,
    meta: result.meta,
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;

  const result = await notificationService.getUnreadCountFromDB(userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Unread count retrieved successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const id = req.params.id as string;

  const result = await notificationService.markNotificationAsReadInDB(
    id,
    userId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;

  const result = await notificationService.markAllNotificationsAsReadInDB(userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "All notifications marked as read",
    data: result,
  });
});

export const notificationController = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
