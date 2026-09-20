import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  env: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5010,
  database_url: process.env.DATABASE_URL,
  app_url: process.env.APP_URL || "http://localhost:3010",
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
  jwt: {
    access_secret: process.env.JWT_ACCESS_SECRET || "s1_access_secret_super_secure_key_2026",
    refresh_secret: process.env.JWT_REFRESH_SECRET || "s1_refresh_secret_super_secure_key_2026",
    access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN || "1d",
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
  google: {
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
  resend: {
    api_key: process.env.RESEND_API_KEY || "",
    sender_email: process.env.SENDER_EMAIL || "no-reply@sharethreado.com",
  },
};

