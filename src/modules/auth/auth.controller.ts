import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { authService } from "./auth.service";

const loginUser = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const { accessToken, refreshToken } = await authService.loginUser(payload);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User login Successful",
    data: {
      accessToken,
      refreshToken,
    },
  });
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const { accessToken, refreshToken, user } = await authService.googleLogin(payload);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Google login successful",
    data: {
      accessToken,
      refreshToken,
      user,
    },
  });
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies?.refreshToken || req.body?.refreshToken;

  const { accessToken } = await authService.refreshToken(token);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  });

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Refresh token successful",
    data: {
      accessToken,
    },
  });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { email, otp } = req.body;
  const result = await authService.verifyEmail(email, otp);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

const resendVerificationOtp = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.resendVerificationOtp(email);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const result = await authService.resetPassword(email, otp, newPassword);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.message,
    data: null,
  });
});

export const authController = {
  loginUser,
  googleLogin,
  refreshToken,
  verifyEmail,
  resendVerificationOtp,
  forgotPassword,
  resetPassword,
};

