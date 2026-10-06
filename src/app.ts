import cookieParser from "cookie-parser";
import express, { Application, Request, Response } from "express";
import cors from "cors";
import config from "./config";
import { userRoutes } from "./modules/user/user.route";
import { authRoutes } from "./modules/auth/auth.route";
import { postRoutes } from "./modules/post/post.route";
import { productRoutes } from "./modules/product/product.route";
import { notificationRoutes } from "./modules/notification/notification.route";

const app: Application = express();

app.set("trust proxy", 1);
app.use(express.json({ limit: "1.5mb" }));
app.use(express.urlencoded({ extended: true, limit: "1.5mb" }));
app.use(cookieParser());
app.use(
  cors({
    origin: config.app_url,
    credentials: true,
  })
);

app.get("/", async ( req: Request, res: Response) => {
  res.send("Hello World!");
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/products", productRoutes);
app.use("/api/notifications", notificationRoutes);

export default app;
