import { PostStatus } from "@prisma/client";

export interface ICreateProductInput {
  title: string;
  subtitle: string;
  description: string;
  logo?: string;
  websiteUrl: string;
  youtubeUrl?: string;
  images?: string[];
  categories: string[];
  status?: PostStatus;
}

export interface IUpdateProductInput {
  title?: string;
  subtitle?: string;
  description?: string;
  logo?: string;
  websiteUrl?: string;
  youtubeUrl?: string;
  images?: string[];
  categories?: string[];
  status?: PostStatus;
}

export interface IGetProductsQuery {
  filter?: "today" | "all-time" | "all";
  category?: string;
  search?: string;
  page?: string | number;
  limit?: string | number;
  authorId?: string;
  status?: PostStatus;
}

export interface IPaginatedProductsResult<T = any> {
  products: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
