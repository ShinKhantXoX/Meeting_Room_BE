import { Router } from "express";
import { z } from "zod";
import {
  findUserById,
  findUserByName,
  findAllUsers,
} from "../services/userService.js";
import { AppError } from "../utils/errors.js";
import { signToken, authMiddleware, getAuth } from "../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z
  .object({
    userId: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
  })
  .refine((d) => d.userId ?? d.name, { message: "Provide userId or name" });

/** Public: list all users for login screen */
authRouter.get("/users", async (_req, res, next) => {
  try {
    const users = await findAllUsers();
    res.json(users);
  } catch (e) {
    next(e);
  }
});

/** Login by userId or name; returns JWT */
authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION",
        parsed.error.errors.map((e) => e.message).join(", "),
        400,
      );
    }
    const { userId, name } = parsed.data;
    const user = userId
      ? await findUserById(userId)
      : await findUserByName(name!);
    if (!user) {
      throw new AppError("NOT_FOUND", "User not found", 404);
    }
    const token = signToken(user.id, user.role);
    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (e) {
    next(e);
  }
});

/** Get current user from JWT */
authRouter.get("/me", authMiddleware, async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const user = await findUserById(auth.userId);
    if (!user) throw new AppError("UNAUTHORIZED", "User not found", 401);
    res.json({ id: user.id, name: user.name, role: user.role });
  } catch (e) {
    next(e);
  }
});
