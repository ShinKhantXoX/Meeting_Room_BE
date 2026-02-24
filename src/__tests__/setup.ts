import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { signToken } from "../middleware/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

/** Ensure test DB schema exists (run once per test run) */
function ensureTestDb(): void {
  const cwd = path.resolve(__dirname, "../..");
  execSync("npx prisma db push", {
    cwd,
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? "file:./test.db",
    },
    stdio: "pipe",
  });
}

/** Delete all bookings and users, then insert seed data (same as prisma/seed.ts) */
export async function resetAndSeed(): Promise<void> {
  await prisma.booking.deleteMany({});
  await prisma.user.deleteMany({});

  const alice = await prisma.user.create({
    data: { id: "seed-admin-id", name: "Alice", role: "admin" },
  });
  const bob = await prisma.user.create({
    data: { id: "seed-owner-id", name: "Bob", role: "owner" },
  });
  const charlie = await prisma.user.create({
    data: { id: "seed-user-c-id", name: "Charlie", role: "user" },
  });
  await prisma.user.create({
    data: { id: "seed-user-d-id", name: "Diana", role: "user" },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await prisma.booking.create({
    data: {
      id: "seed-booking-1",
      userId: alice.id,
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
    },
  });
  await prisma.booking.create({
    data: {
      id: "seed-booking-2",
      userId: bob.id,
      startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 11 * 60 * 60 * 1000),
    },
  });
  await prisma.booking.create({
    data: {
      id: "seed-booking-3",
      userId: charlie.id,
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000),
    },
  });
}

/** Return a JWT for the given user (use seed user ids) */
export function getAuthToken(userId: string, role: string): string {
  return signToken(userId, role);
}

/** Seed user IDs for tests */
export const SEED = {
  adminId: "seed-admin-id",
  ownerId: "seed-owner-id",
  userId: "seed-user-c-id",
  userId2: "seed-user-d-id",
  booking1: "seed-booking-1",
  booking2: "seed-booking-2",
  booking3: "seed-booking-3",
} as const;

beforeAll(async () => {
  ensureTestDb();
  await resetAndSeed();
});

afterAll(async () => {
  await prisma.$disconnect();
});
