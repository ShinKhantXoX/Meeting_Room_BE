import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import {
  findAllUsers,
  createUser,
  updateUserRole,
  deleteUser,
} from "../services/userService.js";
import type { Role } from "../services/userService.js";
import { AppError } from "../utils/errors.js";

export const usersRouter = Router();

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "owner", "user"]),
});

const updateRoleSchema = z.object({
  role: z.enum(["admin", "owner", "user"]),
});

/** List all users (admin or owner) */
usersRouter.get(
  "/",
  authMiddleware,
  authorize("admin", "owner"),
  async (_req, res, next) => {
    try {
      const users = await findAllUsers();
      res.json(users);
    } catch (e) {
      next(e);
    }
  },
);

/** Create user (admin only) */
usersRouter.post(
  "/",
  authMiddleware,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          "VALIDATION",
          parsed.error.errors.map((e) => e.message).join(", "),
          400,
        );
      }
      const { name, role } = parsed.data;
      const user = await createUser(name, role as Role);
      res.status(201).json(user);
    } catch (e) {
      next(e);
    }
  },
);

/** Update user role (admin only) */
usersRouter.patch(
  "/:id",
  authMiddleware,
  authorize("admin"),
  async (req, res, next) => {
    try {
      const parsed = updateRoleSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          "VALIDATION",
          parsed.error.errors.map((e) => e.message).join(", "),
          400,
        );
      }
      const user = await updateUserRole(
        req.params.id,
        parsed.data.role as Role,
      );
      res.json(user);
    } catch (e) {
      next(e);
    }
  },
);

/** Delete user; bookings are cascade-deleted (admin only) */
usersRouter.delete(
  "/:id",
  authMiddleware,
  authorize("admin"),
  async (req, res, next) => {
    try {
      await deleteUser(req.params.id);
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  },
);
