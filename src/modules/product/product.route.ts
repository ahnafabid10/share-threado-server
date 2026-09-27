import { Router } from "express";
import { auth, optionalAuth } from "../../middlewares/auth";
import { productController } from "./product.controller";
import { Role } from "@prisma/client";

const router = Router();

// Public & Optional Auth routes
router.get("/", optionalAuth(), productController.getAllProducts);
router.get("/:slug", optionalAuth(), productController.getSingleProduct);
router.post("/:id/visit", productController.trackVisit);

// Authenticated routes
router.post(
  "/",
  auth(Role.ADMIN, Role.USER),
  productController.createProduct
);
router.post(
  "/:id/upvote",
  auth(Role.ADMIN, Role.USER),
  productController.toggleUpvote
);
router.patch(
  "/:id",
  auth(Role.ADMIN, Role.USER),
  productController.updateProduct
);
router.delete(
  "/:id",
  auth(Role.ADMIN, Role.USER),
  productController.deleteProduct
);

export const productRoutes = router;
