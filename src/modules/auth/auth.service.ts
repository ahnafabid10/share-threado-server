import bcrypt from "bcrypt";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { IAuthResponse, IGoogleLoginUser, ILoginUser } from "./auth.interface";
import { JwtPayload } from "jsonwebtoken";
import { generateOtp, sendVerificationOtpEmail, sendForgotPasswordOtpEmail } from "../../utils/email.service";

const loginUser = async (payload: ILoginUser): Promise<IAuthResponse> => {
  const { email, password } = payload;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  if (user.activeStatus === "BLOCKED") {
    throw new Error("This account is blocked. Please contact system support.");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password.");
  }

  if (!user.isVerified) {
    throw new Error("EMAIL_NOT_VERIFIED: Your email address is not verified yet. Please verify your email address to log in.");
  }


  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt.access_secret,
    config.jwt.access_expires_in
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt.refresh_secret,
    config.jwt.refresh_expires_in
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      profilePhoto: user.profilePhoto,
      isVerified: user.isVerified,
    },
  };
};

const googleLogin = async (payload: IGoogleLoginUser): Promise<IAuthResponse> => {
  let userEmail = payload.email;
  let userName = payload.name;
  let userPhoto = payload.profilePhoto;

  if (payload.idToken) {
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${payload.idToken}`
      );
      if (response.ok) {
        const googleUser = (await response.json()) as {
          email?: string;
          name?: string;
          picture?: string;
          given_name?: string;
        };
        if (googleUser.email) {
          userEmail = googleUser.email;
          userName = googleUser.name || googleUser.given_name || userName || "Google User";
          userPhoto = googleUser.picture || userPhoto;
        }
      }
    } catch (err) {
      console.error("Google token verification error:", err);
    }
  }

  if (!userEmail) {
    throw new Error("Unable to authenticate with Google. Valid email required.");
  }

  const normalizedEmail = userEmail.toLowerCase().trim();

  let user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    const randomPassword =
      Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(randomPassword, config.bcrypt_salt_rounds);

    const baseUsername =
      normalizedEmail.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 25) || "user";
    let candidateUsername = baseUsername;
    const existing = await prisma.user.findUnique({ where: { username: candidateUsername } });
    if (existing) {
      candidateUsername = `${candidateUsername}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    user = await prisma.user.create({
      data: {
        name: (userName || "Google User").trim(),
        username: candidateUsername,
        email: normalizedEmail,
        password: hashedPassword,
        role: "USER",
        profilePhoto: userPhoto || null,
        isVerified: true, // Google login emails are automatically verified
      },
    });
  } else if (user.activeStatus === "BLOCKED") {
    throw new Error("This account is blocked. Please contact system support.");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt.access_secret,
    config.jwt.access_expires_in
  );

  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt.refresh_secret,
    config.jwt.refresh_expires_in
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      profilePhoto: user.profilePhoto,
      isVerified: user.isVerified,
    },
  };
};

const refreshToken = async (token: string): Promise<{ accessToken: string }> => {
  if (!token) {
    throw new Error("Refresh token is required.");
  }

  const verification = jwtUtils.verifyToken(token, config.jwt.refresh_secret);
  if (!verification.success || !verification.data) {
    throw new Error("Invalid or expired refresh token.");
  }

  const { id } = verification.data as JwtPayload & { id: string };

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new Error("User associated with refresh token not found.");
  }

  if (user.activeStatus === "BLOCKED") {
    throw new Error("Account is blocked.");
  }

  const jwtPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt.access_secret,
    config.jwt.access_expires_in
  );

  return { accessToken };
};

const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) {
    throw new Error("User profile not found.");
  }

  return user;
};

const checkAndIncrementOtpRateLimit = (user: { otpSendCount: number; otpFirstSentAt: Date | null }) => {
  const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;
  const now = new Date();

  let newCount = 1;
  let firstSentAt = now;

  if (user.otpFirstSentAt) {
    const elapsed = now.getTime() - new Date(user.otpFirstSentAt).getTime();
    if (elapsed < EIGHT_HOURS_MS) {
      if (user.otpSendCount >= 2) {
        const remainingMinutes = Math.ceil((EIGHT_HOURS_MS - elapsed) / (1000 * 60));
        const remainingHours = Math.ceil(remainingMinutes / 60);
        throw new Error(
          `OTP email limit reached. You can only receive up to 2 OTP emails per 8 hours. Please try again in ${remainingHours} hours.`
        );
      }
      newCount = user.otpSendCount + 1;
      firstSentAt = new Date(user.otpFirstSentAt);
    }
  }

  return { newCount, firstSentAt };
};

const verifyEmail = async (email: string, otp: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("User with this email was not found.");
  }

  if (user.isVerified) {
    return { message: "Email is already verified." };
  }

  if (!user.verificationOtp || user.verificationOtp !== otp.trim()) {
    throw new Error("Invalid verification OTP code.");
  }

  if (!user.verificationOtpExpires || new Date() > user.verificationOtpExpires) {
    throw new Error("Verification OTP code has expired. Please request a new code.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isVerified: true,
      verificationOtp: null,
      verificationOtpExpires: null,
    },
  });

  return { message: "Email address verified successfully!" };
};

const resendVerificationOtp = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("User with this email was not found.");
  }

  if (user.isVerified) {
    throw new Error("Email address is already verified.");
  }

  const { newCount, firstSentAt } = checkAndIncrementOtpRateLimit(user);

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 Hours

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationOtp: otp,
      verificationOtpExpires: otpExpiresAt,
      otpSendCount: newCount,
      otpFirstSentAt: firstSentAt,
    },
  });

  await sendVerificationOtpEmail(user.email, otp);

  return { message: `Verification OTP code sent to your email (${newCount}/2 sent in 8 hours).` };
};

const forgotPassword = async (email: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return { message: "If an account with this email exists, a password reset OTP has been sent." };
  }

  const { newCount, firstSentAt } = checkAndIncrementOtpRateLimit(user);

  const otp = generateOtp();
  const otpExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 Hours

  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetPasswordOtp: otp,
      resetPasswordOtpExpires: otpExpiresAt,
      otpSendCount: newCount,
      otpFirstSentAt: firstSentAt,
    },
  });

  await sendForgotPasswordOtpEmail(user.email, otp);

  return { message: `Password reset OTP has been sent to your email (${newCount}/2 sent in 8 hours).` };
};


const resetPassword = async (email: string, otp: string, newPassword: string) => {
  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new Error("User with this email was not found.");
  }

  if (!user.resetPasswordOtp || user.resetPasswordOtp !== otp.trim()) {
    throw new Error("Invalid password reset OTP code.");
  }

  if (!user.resetPasswordOtpExpires || new Date() > user.resetPasswordOtpExpires) {
    throw new Error("Password reset OTP code has expired. Please request a new code.");
  }

  const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt_salt_rounds);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetPasswordOtp: null,
      resetPasswordOtpExpires: null,
    },
  });

  return { message: "Password has been reset successfully." };
};

export const authService = {
  loginUser,
  googleLogin,
  refreshToken,
  getMe,
  verifyEmail,
  resendVerificationOtp,
  forgotPassword,
  resetPassword,
};

