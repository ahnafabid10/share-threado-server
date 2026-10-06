import { NotificationType } from "@prisma/client";

export interface ICreateNotificationPayload {
  recipientId: string;
  senderId: string;
  type: NotificationType;
  message: string;
  link: string;
}

export interface IGetNotificationsQuery {
  page?: string | number;
  limit?: string | number;
  unreadOnly?: string;
}
