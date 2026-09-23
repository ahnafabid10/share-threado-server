import bcrypt from "bcrypt";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { RegisterUserPayload, UpdateUserProfilePayload } from "./user.interface";

import { generateOtp, sendVerificationOtpEmail } from "../../utils/email.service";

const registerUserIntoDB = async (payload: RegisterUserPayload) => {
  const { name, email, password, role, profilePhoto, username, bio, website, location } = payload;
  
  const normalizedEmail = email.toLowerCase().trim();
  const isUserExist = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (isUserExist) {
    throw new Error("User with this email already exists");
  }

  // Validate or fallback username
  const normalizedUsername = (username || normalizedEmail.split("@")[0])
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, "");

  if (!normalizedUsername) {
    throw new Error("A valid username is required");
  }

  const isUsernameExist = await prisma.user.findUnique({
    where: {
      username: normalizedUsername,
    },
  });

  if (isUsernameExist) {
    throw new Error("This username is already taken. Please choose another one.");
  }

  const hashedPassword = await bcrypt.hash(
    password,
    Number(config.bcrypt_salt_rounds)
  );

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 Hours

  const createdUser = await prisma.user.create({
    data: {
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: role || "USER",
      profilePhoto: profilePhoto || null,
      bio: bio || null,
      website: website || null,
      location: location || null,
      isVerified: false,
      verificationOtp: otp,
      verificationOtpExpires: otpExpiresAt,
      otpSendCount: 1,
      otpFirstSentAt: new Date(),
    },

    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      accountType: true,
      activeStatus: true,
      profilePhoto: true,
      bio: true,
      website: true,
      location: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  try {
    await sendVerificationOtpEmail(createdUser.email, otp);
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }

  return createdUser;
};

const getMyProfileFromDB = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      accountType: true,
      activeStatus: true,
      profilePhoto: true,
      bio: true,
      website: true,
      location: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
};

const getUserProfileByUsernameFromDB = async (username: string) => {
  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username.toLowerCase().trim(),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      accountType: true,
      activeStatus: true,
      profilePhoto: true,
      bio: true,
      website: true,
      location: true,
      createdAt: true,
      updatedAt: true,
      posts: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              role: true,
              accountType: true,
              profilePhoto: true,
            },
          },
          lovesList: true,
        },
      },
      _count: {
        select: {
          posts: {
            where: {
              status: "PUBLISHED",
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

const updateMyProfileInDB = async (userId: string, payload: UpdateUserProfilePayload) => {
  const { name, username, email, profilePhoto, bio, website, location } = payload;

  if (username) {
    const normalizedUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
    const existing = await prisma.user.findFirst({
      where: {
        username: normalizedUsername,
        NOT: { id: userId },
      },
    });
    if (existing) {
      throw new Error("This username is already taken");
    }
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      ...(name && { name: name.trim() }),
      ...(username && { username: username.toLowerCase().trim() }),
      ...(email && { email: email.toLowerCase().trim() }),
      ...(profilePhoto !== undefined && { profilePhoto }),
      ...(bio !== undefined && { bio }),
      ...(website !== undefined && { website }),
      ...(location !== undefined && { location }),
    },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      accountType: true,
      activeStatus: true,
      profilePhoto: true,
      bio: true,
      website: true,
      location: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

export const userService = {
  registerUserIntoDB,
  getMyProfileFromDB,
  getUserProfileByUsernameFromDB,
  updateMyProfileInDB,
};
