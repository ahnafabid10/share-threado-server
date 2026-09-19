import { prisma } from "../../lib/prisma";
import { ICreatePostInput, IUpdatePostInput } from "./post.interface";

const createPostInDB = async (
  authorId: string,
  userRole: string | undefined,
  payload: ICreatePostInput
) => {
  // All posts default to PUBLISHED directly so anyone can post immediately
  const postStatus = payload.status || "PUBLISHED";

  const post = await prisma.post.create({
    data: {
      content: payload.content,
      image: payload.image,
      status: postStatus,
      authorId,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountType: true,
          profilePhoto: true,
        },
      },
    },
  });

  return post;
};

const getAllPostsFromDB = async (query?: { admin?: string; status?: string }) => {
  const where: any = {};

  if (query?.admin === "true") {
    if (query?.status && query.status.toLowerCase() !== "all") {
      where.status = query.status.toUpperCase();
    }
  } else {
    // Public feed: strictly show ONLY approved (PUBLISHED) posts!
    where.status = "PUBLISHED";
  }

  const posts = await prisma.post.findMany({
    where,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountType: true,
          profilePhoto: true,
        },
      },
      lovesList: {
        select: {
          userId: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts;
};

const getMyPostsFromDB = async (authorId: string) => {
  const posts = await prisma.post.findMany({
    where: {
      authorId,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountType: true,
          profilePhoto: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return posts;
};

const getSinglePostFromDB = async (id: string) => {
  const post = await prisma.post.findUnique({
    where: {
      id,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountType: true,
          profilePhoto: true,
        },
      },
    },
  });

  return post;
};

const updatePostInDB = async (
  id: string,
  userId: string,
  userRole: string,
  payload: IUpdatePostInput
) => {
  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  if (post.authorId !== userId && userRole !== "ADMIN") {
    throw new Error("You are not authorized to update this post");
  }

  const updatedPost = await prisma.post.update({
    where: { id },
    data: payload,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          accountType: true,
          profilePhoto: true,
        },
      },
    },
  });

  return updatedPost;
};

const deletePostInDB = async (id: string, userId: string, userRole: string) => {
  const post = await prisma.post.findUnique({
    where: { id },
  });

  if (!post) {
    throw new Error("Post not found");
  }

  if (post.authorId !== userId && userRole !== "ADMIN") {
    throw new Error("You are not authorized to delete this post");
  }

  const deletedPost = await prisma.post.delete({
    where: { id },
  });

  return deletedPost;
};

const getPostStatsFromDB = async () => {
  const [totalPosts, publishedPosts, draftPosts, pendingPosts, totalUsers] =
    await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.post.count({ where: { status: "PENDING" } }),
      prisma.user.count(),
    ]);

  return {
    totalPosts,
    publishedPosts,
    draftPosts,
    pendingPosts,
    totalUsers,
  };
};

const toggleLoveInDB = async (postId: string, userId: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error("Post not found");
  }

  const existingLove = await prisma.postLove.findUnique({
    where: {
      userId_postId: {
        userId,
        postId,
      },
    },
  });

  if (existingLove) {
    // User already loved this post -> Toggle off (remove love)
    await prisma.$transaction([
      prisma.postLove.delete({
        where: { id: existingLove.id },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { loves: { decrement: 1 } },
      }),
    ]);

    const updatedPost = await prisma.post.findUnique({ where: { id: postId } });
    return { isLoved: false, loves: updatedPost?.loves ?? 0 };
  } else {
    // Add love react for this user
    await prisma.$transaction([
      prisma.postLove.create({
        data: { userId, postId },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { loves: { increment: 1 } },
      }),
    ]);

    const updatedPost = await prisma.post.findUnique({ where: { id: postId } });
    return { isLoved: true, loves: updatedPost?.loves ?? 0 };
  }
};

export const postService = {
  createPostInDB,
  getAllPostsFromDB,
  getMyPostsFromDB,
  getSinglePostFromDB,
  updatePostInDB,
  deletePostInDB,
  getPostStatsFromDB,
  toggleLoveInDB,
};
