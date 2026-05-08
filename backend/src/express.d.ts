import type {} from "express-serve-static-core";

export interface AuthContext {
  clubId: string;
  userId: string;
  token: string;
}

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}
