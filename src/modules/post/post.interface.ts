import { PostStatus } from "@prisma/client";

export interface ICreatePostInput {
  content: string;
  image?: string;
  status?: PostStatus;
}

export interface IUpdatePostInput {
  content?: string;
  image?: string;
  status?: PostStatus;
}

export interface IGetPostsQuery {
  cursor?: string;
  limit?: string | number;
  sort?: "recent" | "popular";
  admin?: string;
  status?: string;
  all?: string;
}

export interface IPaginatedPostsResult<T = any> {
  posts: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

