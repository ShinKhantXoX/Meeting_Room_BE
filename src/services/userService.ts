import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type Role = "admin" | "owner" | "user";

export async function findAllUsers() {
  return prisma.user.findMany({ orderBy: { name: "asc" } });
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function findUserByName(name: string) {
  return prisma.user.findFirst({ where: { name } });
}

export async function createUser(name: string, role: Role) {
  return prisma.user.create({ data: { name, role } });
}

export async function updateUserRole(id: string, role: Role) {
  return prisma.user.update({ where: { id }, data: { role } });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}
