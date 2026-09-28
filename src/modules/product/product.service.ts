import { prisma } from "../../lib/prisma";
import {
  ICreateProductInput,
  IGetProductsQuery,
  IPaginatedProductsResult,
  IUpdateProductInput,
} from "./product.interface";

// Helper to generate a clean URL slug from title
const generateSlug = async (title: string): Promise<string> => {
  const baseSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  let slug = baseSlug || "product";
  let count = 0;

  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return slug;
    }

    count += 1;
    slug = `${baseSlug}-${count}`;
  }
};

const authorSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  accountType: true,
  profilePhoto: true,
  bio: true,
  website: true,
  location: true,
  createdAt: true,
};

const createProductIntoDB = async (
  authorId: string,
  userRole: string | undefined,
  payload: ICreateProductInput
) => {
  // Validate images count (1 to 4 required)
  const images = payload.images || [];
  if (!Array.isArray(images) || images.length < 1) {
    throw new Error("At least 1 product screenshot/image is required.");
  }
  if (images.length > 4) {
    throw new Error("Maximum 4 product screenshots/images are allowed.");
  }

  const slug = await generateSlug(payload.title);
  const status = payload.status || "PUBLISHED";

  const product = await prisma.product.create({
    data: {
      title: payload.title,
      slug,
      subtitle: payload.subtitle,
      description: payload.description,
      logo: payload.logo || null,
      websiteUrl: payload.websiteUrl,
      youtubeUrl: payload.youtubeUrl || null,
      images,
      categories: payload.categories || [],
      status,
      authorId,
    },
    include: {
      author: {
        select: authorSelect,
      },
    },
  });

  return product;
};

const getAllProductsFromDB = async (
  query?: IGetProductsQuery,
  currentUserId?: string
): Promise<IPaginatedProductsResult> => {
  const where: any = {};

  // Status Filter
  if (query?.status) {
    where.status = query.status;
  } else {
    where.status = "PUBLISHED";
  }

  // Today Filter vs All Time
  if (query?.filter === "today") {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    where.createdAt = {
      gte: startOfToday,
    };
  }

  // Category Filter
  if (query?.category && query.category.toLowerCase() !== "all") {
    where.categories = {
      has: query.category,
    };
  }

  // Author Filter
  if (query?.authorId) {
    where.authorId = query.authorId;
  }

  // Search Filter
  if (query?.search && query.search.trim()) {
    const searchTrimmed = query.search.trim();
    where.OR = [
      { title: { contains: searchTrimmed, mode: "insensitive" } },
      { subtitle: { contains: searchTrimmed, mode: "insensitive" } },
      { description: { contains: searchTrimmed, mode: "insensitive" } },
    ];
  }

  const page = Math.max(Number(query?.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query?.limit) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const [rawProducts, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ upvoteCount: "desc" }, { createdAt: "desc" }],
      include: {
        author: {
          select: authorSelect,
        },
        upvotesList: currentUserId
          ? {
              where: { userId: currentUserId },
              select: { userId: true },
            }
          : {
              take: 0,
              select: { userId: true },
            },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const products = rawProducts.map((p) => {
    const isUpvoted = currentUserId
      ? p.upvotesList.some((u) => u.userId === currentUserId)
      : false;
    const { upvotesList, ...rest } = p;
    return {
      ...rest,
      isUpvoted,
    };
  });

  return {
    products,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getProductBySlugOrIdFromDB = async (
  identifier: string,
  currentUserId?: string
) => {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      identifier
    );

  const product = await prisma.product.findFirst({
    where: isUuid
      ? { OR: [{ id: identifier }, { slug: identifier }] }
      : { slug: identifier },
    include: {
      author: {
        select: authorSelect,
      },
      upvotesList: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { userId: true },
          }
        : {
            take: 0,
            select: { userId: true },
          },
    },
  });

  if (!product) {
    return null;
  }

  const isUpvoted = currentUserId
    ? product.upvotesList.some((u) => u.userId === currentUserId)
    : false;

  const { upvotesList, ...rest } = product;

  return {
    ...rest,
    isUpvoted,
  };
};

const toggleProductUpvoteInDB = async (productId: string, userId: string) => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, upvoteCount: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const existingUpvote = await prisma.productUpvote.findUnique({
    where: {
      userId_productId: {
        userId,
        productId,
      },
    },
  });

  if (existingUpvote) {
    // Remove upvote
    await prisma.$transaction([
      prisma.productUpvote.delete({
        where: { id: existingUpvote.id },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { upvoteCount: { decrement: 1 } },
      }),
    ]);

    const updated = await prisma.product.findUnique({
      where: { id: productId },
      select: { upvoteCount: true },
    });

    return {
      isUpvoted: false,
      upvoteCount: updated?.upvoteCount ?? 0,
    };
  } else {
    // Add upvote
    await prisma.$transaction([
      prisma.productUpvote.create({
        data: {
          userId,
          productId,
        },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { upvoteCount: { increment: 1 } },
      }),
    ]);

    const updated = await prisma.product.findUnique({
      where: { id: productId },
      select: { upvoteCount: true },
    });

    return {
      isUpvoted: true,
      upvoteCount: updated?.upvoteCount ?? 0,
    };
  }
};

const trackProductVisitInDB = async (
  productId: string,
  _source?: string
) => {
  const product = await prisma.product.update({
    where: { id: productId },
    data: {
      visitCount: {
        increment: 1,
      },
    },
    select: {
      id: true,
      visitCount: true,
      websiteUrl: true,
    },
  });

  return product;
};

const updateProductInDB = async (
  id: string,
  userId: string,
  userRole: string,
  payload: IUpdateProductInput
) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.authorId !== userId && userRole !== "ADMIN") {
    throw new Error("You are not authorized to update this product");
  }

  if (payload.images !== undefined) {
    if (!Array.isArray(payload.images) || payload.images.length < 1) {
      throw new Error("At least 1 product screenshot/image is required.");
    }
    if (payload.images.length > 4) {
      throw new Error("Maximum 4 product screenshots/images are allowed.");
    }
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: payload,
    include: {
      author: {
        select: authorSelect,
      },
    },
  });

  return updatedProduct;
};

const deleteProductFromDB = async (
  id: string,
  userId: string,
  userRole: string
) => {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  if (product.authorId !== userId && userRole !== "ADMIN") {
    throw new Error("You are not authorized to delete this product");
  }

  const deletedProduct = await prisma.product.delete({
    where: { id },
  });

  return deletedProduct;
};

export const productService = {
  createProductIntoDB,
  getAllProductsFromDB,
  getProductBySlugOrIdFromDB,
  toggleProductUpvoteInDB,
  trackProductVisitInDB,
  updateProductInDB,
  deleteProductFromDB,
};
