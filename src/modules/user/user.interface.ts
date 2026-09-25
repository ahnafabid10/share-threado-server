import { Role } from "@prisma/client";

export interface RegisterUserPayload {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: Role;
  profilePhoto?: string;
  bio?: string;
  website?: string;
  location?: string;
}

export interface UpdateUserProfilePayload {
  name?: string;
  username?: string;
  email?: string;
  profilePhoto?: string;
  bio?: string;
  website?: string;
  location?: string;
}
