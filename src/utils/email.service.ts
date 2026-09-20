import { Resend } from "resend";
import config from "../config/index.js";

const resend = new Resend(config.resend.api_key);

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationOtpEmail = async (email: string, otp: string) => {
  const fromEmail = config.resend.sender_email || "no-reply@sharethreado.com";
  
  try {
    const { data, error } = await resend.emails.send({
      from: `ShareThreado <${fromEmail}>`,
      to: [email],
      subject: "ShareThreado - Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #2563eb; text-align: center; margin-bottom: 20px;">Welcome to ShareThreado!</h2>
          <p style="font-size: 16px; color: #333333;">Thank you for registering. Please use the following 6-digit OTP code to verify your email address:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #2563eb; background-color: #eff6ff; padding: 12px 24px; border-radius: 8px; border: 1px dashed #2563eb;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #666666; text-align: center;">This OTP code is valid for <strong>8 hours</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999999; text-align: center;">If you did not request this code, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error sending verification email:", error);
      throw new Error(error.message);
    }
    return data;
  } catch (err) {
    console.error("Failed to send verification email:", err);
    throw err;
  }
};

export const sendForgotPasswordOtpEmail = async (email: string, otp: string) => {
  const fromEmail = config.resend.sender_email || "no-reply@sharethreado.com";

  try {
    const { data, error } = await resend.emails.send({
      from: `ShareThreado <${fromEmail}>`,
      to: [email],
      subject: "ShareThreado - Password Reset Verification Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background-color: #ffffff;">
          <h2 style="color: #dc2626; text-align: center; margin-bottom: 20px;">Reset Your Password</h2>
          <p style="font-size: 16px; color: #333333;">We received a request to reset your password. Use the 6-digit OTP code below to proceed:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #dc2626; background-color: #fef2f2; padding: 12px 24px; border-radius: 8px; border: 1px dashed #dc2626;">${otp}</span>
          </div>
          <p style="font-size: 14px; color: #666666; text-align: center;">This code will expire in <strong>8 hours</strong>.</p>
          <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999999; text-align: center;">If you did not request a password reset, no action is required.</p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend error sending password reset email:", error);
      throw new Error(error.message);
    }
    return data;
  } catch (err) {
    console.error("Failed to send password reset email:", err);
    throw err;
  }
};
