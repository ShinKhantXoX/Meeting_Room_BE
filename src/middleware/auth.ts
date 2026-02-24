import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/errors.js";
import { findUserById } from "../services/userService.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export interface JwtPayload {
  userId: string;
  role: string;
}

export interface AuthLocals {
  userId: string;
  role: string;
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    next(
      new AppError(
        "UNAUTHORIZED",
        "Missing or invalid authorization header",
        401,
      ),
    );
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await findUserById(payload.userId);
    if (!user) {
      next(new AppError("UNAUTHORIZED", "User no longer exists", 401));
      return;
    }
    (req as Request & { locals: AuthLocals }).locals = {
      userId: user.id,
      role: user.role,
    };
    next();
  } catch {
    next(new AppError("UNAUTHORIZED", "Invalid or expired token", 401));
  }
}

export function getAuth(req: Request): AuthLocals {
  const locals = (req as Request & { locals?: AuthLocals }).locals;
  if (!locals) throw new AppError("UNAUTHORIZED", "Not authenticated", 401);
  return locals;
}

export function signToken(userId: string, role: string): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: "7d" });
}
