import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { usersRouter } from "./routes/users.js";
import { bookingsRouter } from "./routes/bookings.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/bookings", bookingsRouter);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use(errorHandler);
