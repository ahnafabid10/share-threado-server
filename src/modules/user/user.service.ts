import bcrypt from "bcrypt";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { RegisterUserPayload } from "./user.interface";

import { generateOtp, sendVerificationOtpEmail } from "../../utils/email.service";

const registerUserIntoDB = async (payload: RegisterUserPayload) => {
  const { name, email, password, role, profilePhoto } = payload;
  const isUserExist = await prisma.user.findUnique({
    where: {
      email: email.toLowerCase().trim(),
    },
  });

  if (isUserExist) {
    throw new Error("User already exists");
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
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "USER",
      profilePhoto: profilePhoto || null,
      isVerified: false,
      verificationOtp: otp,
      verificationOtpExpires: otpExpiresAt,
      otpSendCount: 1,
      otpFirstSentAt: new Date(),
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountType: true,
      activeStatus: true,
      profilePhoto: true,
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
      email: true,
      role: true,
      accountType: true,
      activeStatus: true,
      profilePhoto: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
};

const updateMyProfileInDB = async (userId: string, payload: any) => {
  const { name, email, profilePhoto } = payload;

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(profilePhoto !== undefined && { profilePhoto }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      accountType: true,
      activeStatus: true,
      profilePhoto: true,
      updatedAt: true,
    },
  });

  return updatedUser;
};

export const userService = {
  registerUserIntoDB,
  getMyProfileFromDB,
  updateMyProfileInDB,
};
