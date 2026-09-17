import bcrypt from "bcrypt";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { IAuthResponse, IGoogleLoginUser, ILoginUser, IRegisterUser } from "./auth.interface";
import { JwtPayload } from "jsonwebtoken";

const registerUser = async (payload: IRegisterUser): Promise<IAuthResponse> => {
  const { name, email, password, role, profilePhoto } = payload;

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existingUser) {
    throw new Error("A user with this email address already exists.");
  }

  const hashedPassword = await bcrypt.hash(password, config.bcrypt_salt_rounds);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role || "USER",
      profilePhoto: profilePhoto || null,
    },
  });

  const jwtPayload = {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role,
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
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      accountType: newUser.accountType,
      profilePhoto: newUser.profilePhoto,
    },
  };
};

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
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      profilePhoto: user.profilePhoto,
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

    user = await prisma.user.create({
      data: {
        name: (userName || "Google User").trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: "USER",
        profilePhoto: userPhoto || null,
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
      email: user.email,
      role: user.role,
      accountType: user.accountType,
      profilePhoto: user.profilePhoto,
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
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("User profile not found.");
  }

  return user;
};

export const authService = {
  registerUser,
  loginUser,
  googleLogin,
  refreshToken,
  getMe,
};
