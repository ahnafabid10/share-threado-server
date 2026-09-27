import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { productService } from "./product.service";
import { IGetProductsQuery } from "./product.interface";

const createProduct = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const userRole = req.user?.role as string;
  const payload = req.body;

  const result = await productService.createProductIntoDB(
    userId,
    userRole,
    payload
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Product created successfully",
    data: result,
  });
});

const getAllProducts = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as IGetProductsQuery;
  const currentUserId = req.user?.id;

  const result = await productService.getAllProductsFromDB(
    query,
    currentUserId
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Products retrieved successfully",
    data: result.products,
    meta: result.meta,
  });
});

const getSingleProduct = catchAsync(async (req: Request, res: Response) => {
  const identifier = req.params.slug as string;
  const currentUserId = req.user?.id;

  const result = await productService.getProductBySlugOrIdFromDB(
    identifier,
    currentUserId
  );

  if (!result) {
    sendResponse(res, {
      success: false,
      statusCode: httpStatus.NOT_FOUND,
      message: "Product not found",
      data: null,
    });
    return;
  }

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product retrieved successfully",
    data: result,
  });
});

const toggleUpvote = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id as string;

  const result = await productService.toggleProductUpvoteInDB(id, userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.isUpvoted
      ? "Product upvoted successfully"
      : "Product upvote removed successfully",
    data: result,
  });
});

const trackVisit = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const source = (req.body?.source as string) || (req.query?.source as string) || "direct";

  const result = await productService.trackProductVisitInDB(id, source);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product visit recorded successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id as string;
  const userRole = req.user?.role as string;
  const payload = req.body;

  const result = await productService.updateProductInDB(
    id,
    userId,
    userRole,
    payload
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product updated successfully",
    data: result,
  });
});

const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id as string;
  const userRole = req.user?.role as string;

  const result = await productService.deleteProductFromDB(
    id,
    userId,
    userRole
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product deleted successfully",
    data: result,
  });
});

export const productController = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  toggleUpvote,
  trackVisit,
  updateProduct,
  deleteProduct,
};
