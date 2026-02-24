import { Router } from "express";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth.js";
import { getAuth } from "../middleware/auth.js";
import { authorize } from "../middleware/authorize.js";
import {
  findAllBookings,
  findBookingById,
  findOverlappingBookings,
  createBooking,
  deleteBooking,
  getBookingsGroupedByUser,
  getUsageSummary,
} from "../services/bookingService.js";
import { AppError } from "../utils/errors.js";

export const bookingsRouter = Router();

const createBookingSchema = z
  .object({
    startTime: z.string().datetime({ message: "startTime must be ISO 8601" }),
    endTime: z.string().datetime({ message: "endTime must be ISO 8601" }),
  })
  .refine(
    (d) => new Date(d.startTime).getTime() < new Date(d.endTime).getTime(),
    { message: "startTime must be before endTime", path: ["endTime"] },
  );

/** List all bookings; optional ?groupBy=user for owner/admin */
bookingsRouter.get("/", authMiddleware, async (req, res, next) => {
  try {
    const groupBy = req.query.groupBy === "user";
    if (groupBy) {
      const auth = getAuth(req);
      if (auth.role !== "admin" && auth.role !== "owner") {
        throw new AppError(
          "FORBIDDEN",
          "Only owner or admin can view bookings grouped by user",
          403,
        );
      }
      const grouped = await getBookingsGroupedByUser();
      return res.json(grouped);
    }
    const startDate =
      typeof req.query.startDate === "string"
        ? new Date(req.query.startDate)
        : undefined;
    const endDate =
      typeof req.query.endDate === "string"
        ? new Date(req.query.endDate)
        : undefined;
    const userName =
      typeof req.query.userName === "string" ? req.query.userName : undefined;
    const bookings = await findAllBookings({ startDate, endDate, userName });
    res.json(bookings);
  } catch (e) {
    next(e);
  }
});

/** Usage summary: total bookings per user (owner/admin) */
bookingsRouter.get(
  "/summary",
  authMiddleware,
  authorize("admin", "owner"),
  async (_req, res, next) => {
    try {
      const summary = await getUsageSummary();
      res.json(summary);
    } catch (e) {
      next(e);
    }
  },
);

/** Create booking; overlap check enforced */
bookingsRouter.post("/", authMiddleware, async (req, res, next) => {
  try {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.errors.map((e) => e.message).join(", ");
      throw new AppError("VALIDATION", msg, 400);
    }
    const auth = getAuth(req);
    const startTime = new Date(parsed.data.startTime);
    const endTime = new Date(parsed.data.endTime);
    const overlapping = await findOverlappingBookings(startTime, endTime);
    if (overlapping.length > 0) {
      throw new AppError(
        "OVERLAP",
        "Booking overlaps with an existing booking",
        409,
      );
    }
    const booking = await createBooking(auth.userId, startTime, endTime);
    res.status(201).json(booking);
  } catch (e) {
    next(e);
  }
});

/** Delete booking (user: own only; owner/admin: any) */
bookingsRouter.delete("/:id", authMiddleware, async (req, res, next) => {
  try {
    const auth = getAuth(req);
    const booking = await findBookingById(req.params.id);
    if (!booking) {
      throw new AppError("NOT_FOUND", "Booking not found", 404);
    }
    if (auth.role === "user" && booking.userId !== auth.userId) {
      throw new AppError(
        "FORBIDDEN",
        "You can only delete your own bookings",
        403,
      );
    }
    await deleteBooking(req.params.id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
});
