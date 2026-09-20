import { Router } from "express";
import { authController } from "./auth.controller";

const router = Router();

router.post("/login", authController.loginUser);
router.post("/google", authController.googleLogin);
router.post("/refresh-token", authController.refreshToken);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification-otp", authController.resendVerificationOtp);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export const authRoutes = router;

