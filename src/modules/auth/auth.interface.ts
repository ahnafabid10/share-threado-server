import { Role } from "@prisma/client";


export interface ILoginUser {
  email: string;
  password: string;
}

export interface IGoogleLoginUser {
  idToken?: string;
  email?: string;
  name?: string;
  profilePhoto?: string;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    username: string | null;
    email: string;
    role: Role;
    accountType?: string;
    profilePhoto?: string | null;
    isVerified?: boolean;
  };
}

