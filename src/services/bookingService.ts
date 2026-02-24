import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function findAllBookings(filters?: {
  startDate?: Date;
  endDate?: Date;
  userName?: string;
}) {
  const where: Record<string, unknown> = {};
  if (filters?.startDate) where.startTime = { gte: filters.startDate };
  if (filters?.endDate) where.endTime = { lte: filters.endDate };
  if (filters?.userName)
    where.user = { name: { contains: filters.userName, mode: "insensitive" } };

  return prisma.booking.findMany({
    where,
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { startTime: "asc" },
  });
}

export async function findBookingById(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true } } },
  });
}

export async function findOverlappingBookings(
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
) {
  const bookings = await prisma.booking.findMany({
    where: {
      startTime: { lt: endTime },
      endTime: { gt: startTime },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
  });
  return bookings;
}

export async function createBooking(
  userId: string,
  startTime: Date,
  endTime: Date,
) {
  return prisma.booking.create({
    data: { userId, startTime, endTime },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
}

export async function deleteBooking(id: string) {
  return prisma.booking.delete({ where: { id } });
}

export async function getBookingsGroupedByUser() {
  const bookings = await prisma.booking.findMany({
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { startTime: "asc" },
  });
  const byUser = new Map<string, typeof bookings>();
  for (const b of bookings) {
    const list = byUser.get(b.userId) ?? [];
    list.push(b);
    byUser.set(b.userId, list);
  }
  return Array.from(byUser.entries()).map(([userId, list]) => ({
    userId,
    user: list[0].user,
    bookings: list,
  }));
}

export async function getUsageSummary() {
  const result = await prisma.booking.groupBy({
    by: ["userId"],
    _count: { id: true },
  });
  const userIds = result.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));
  return result.map((r) => ({
    userId: r.userId,
    user: userMap.get(r.userId),
    totalBookings: r._count.id,
  }));
}
