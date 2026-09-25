import { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { postService } from "./post.service";
import { IGetPostsQuery } from "./post.interface";

const createPost = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const userRole = req.user?.role as string;
  const payload = req.body;

  const result = await postService.createPostInDB(userId, userRole, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Post created successfully",
    data: result,
  });
});

const getAllPosts = catchAsync(async (req: Request, res: Response) => {
  const query = req.query as IGetPostsQuery;
  const result = await postService.getAllPostsFromDB(query);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Posts retrieved successfully",
    data: result,
  });
});

const getSinglePost = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await postService.getSinglePostFromDB(id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Post retrieved successfully",
    data: result,
  });
});

const updatePost = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id as string;
  const userRole = req.user?.role as string;
  const payload = req.body;

  const result = await postService.updatePostInDB(id, userId, userRole, payload);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Post updated successfully",
    data: result,
  });
});

const deletePost = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id as string;
  const userRole = req.user?.role as string;

  const result = await postService.deletePostInDB(id, userId, userRole);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Post deleted successfully",
    data: result,
  });
});

const getMyPosts = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  const result = await postService.getMyPostsFromDB(userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "My posts retrieved successfully",
    data: result,
  });
});

const getPostStats = catchAsync(async (req: Request, res: Response) => {
  const result = await postService.getPostStatsFromDB();

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Post statistics retrieved successfully",
    data: result,
  });
});

const toggleLove = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const userId = req.user?.id as string;
  const result = await postService.toggleLoveInDB(id, userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result.isLoved ? "Post loved successfully" : "Post unloved successfully",
    data: result,
  });
});

export const postController = {
  createPost,
  getAllPosts,
  getSinglePost,
  updatePost,
  deletePost,
  getMyPosts,
  getPostStats,
  toggleLove,
};
