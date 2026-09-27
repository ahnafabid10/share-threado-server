import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import config from "../config";
import { JwtPayload } from "jsonwebtoken";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        name: string;
        id: string;
        role: Role;
      };
    }
  }
}

export const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization?.split(" ")[1]
      : req.headers.authorization;

    if (!token) {
      throw new Error("You are not logged in. please log in to get access.");
    }

    const verifiedToken = jwtUtils.verifyToken(token, config.jwt.access_secret);

    if (!verifiedToken.success) {
      throw new Error(
        verifiedToken.message || "Invalid token. Please log in again."
      );
    }

    const { email, name, id, role } = verifiedToken.data as JwtPayload;

    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new Error("You do not have permission to access this resource.");
    }

    const user = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!user) {
      throw new Error("User not found. Please Log in again");
    }

    if (user.activeStatus === "BLOCKED") {
      throw new Error(
        "Your account has been blocked. Please contact support."
      );
    }

    req.user = {
      email,
      name,
      id,
      role,
    };

    next();
  });
};

export const optionalAuth = () => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken
      ? req.cookies.accessToken
      : req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization?.split(" ")[1]
      : req.headers.authorization;

    if (token) {
      const verifiedToken = jwtUtils.verifyToken(
        token,
        config.jwt.access_secret
      );

      if (verifiedToken.success && verifiedToken.data) {
        const { email, name, id, role } = verifiedToken.data as JwtPayload;
        req.user = { email, name, id, role };
      }
    }

    next();
  });
};

