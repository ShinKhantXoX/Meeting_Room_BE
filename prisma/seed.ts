import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const seedUserIds = [
  "seed-admin-id",
  "seed-owner-id",
  "seed-user-c-id",
  "seed-user-d-id",
];
const seedBookingIds = ["seed-booking-1", "seed-booking-2", "seed-booking-3"];

async function main() {
  await prisma.booking.deleteMany({ where: { id: { notIn: seedBookingIds } } });
  await prisma.user.deleteMany({ where: { id: { notIn: seedUserIds } } });

  const alice = await prisma.user.upsert({
    where: { id: "seed-admin-id" },
    update: { name: "Alice", role: "admin" },
    create: { id: "seed-admin-id", name: "Alice", role: "admin" },
  });
  const bob = await prisma.user.upsert({
    where: { id: "seed-owner-id" },
    update: { name: "Bob", role: "owner" },
    create: { id: "seed-owner-id", name: "Bob", role: "owner" },
  });
  const charlie = await prisma.user.upsert({
    where: { id: "seed-user-c-id" },
    update: { name: "Charlie", role: "user" },
    create: { id: "seed-user-c-id", name: "Charlie", role: "user" },
  });
  const diana = await prisma.user.upsert({
    where: { id: "seed-user-d-id" },
    update: { name: "Diana", role: "user" },
    create: { id: "seed-user-d-id", name: "Diana", role: "user" },
  });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  await prisma.booking.upsert({
    where: { id: "seed-booking-1" },
    update: {},
    create: {
      id: "seed-booking-1",
      userId: alice.id,
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
    },
  });
  await prisma.booking.upsert({
    where: { id: "seed-booking-2" },
    update: {},
    create: {
      id: "seed-booking-2",
      userId: bob.id,
      startTime: new Date(today.getTime() + 10 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 11 * 60 * 60 * 1000),
    },
  });
  await prisma.booking.upsert({
    where: { id: "seed-booking-3" },
    update: {},
    create: {
      id: "seed-booking-3",
      userId: charlie.id,
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000),
      endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000),
    },
  });

  console.log(
    "Seed complete: Alice (admin), Bob (owner), Charlie, Diana (users) + 3 sample bookings",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
