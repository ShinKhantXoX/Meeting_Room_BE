import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { getAuth } from "./auth.js";

type Role = "admin" | "owner" | "user";

/**
 * Restrict route to given roles. Use after authMiddleware.
 */
export function authorize(...allowedRoles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = getAuth(req);
    if (!allowedRoles.includes(auth.role as Role)) {
      next(new AppError("FORBIDDEN", "Insufficient permissions", 403));
      return;
    }
    next();
  };
}
