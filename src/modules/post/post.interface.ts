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
