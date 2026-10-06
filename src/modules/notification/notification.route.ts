import { Router } from "express";
import { auth } from "../../middlewares/auth";
import { notificationController } from "./notification.controller";
import { Role } from "@prisma/client";

const router = Router();

router.get(
  "/",
  auth(Role.ADMIN, Role.USER),
  notificationController.getMyNotifications
);

router.get(
  "/unread-count",
  auth(Role.ADMIN, Role.USER),
  notificationController.getUnreadCount
);

router.patch(
  "/read-all",
  auth(Role.ADMIN, Role.USER),
  notificationController.markAllAsRead
);

router.patch(
  "/:id/read",
  auth(Role.ADMIN, Role.USER),
  notificationController.markAsRead
);

export const notificationRoutes = router;
