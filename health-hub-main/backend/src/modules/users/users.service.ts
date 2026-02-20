import { prisma } from "../../config/db.js";

export async function getMe(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      phone: true,
      department: true,
      specialization: true,
      createdAt: true,
      lastLoginAt: true
    }
  });
}

export async function listUsers() {
  return prisma.user.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      phone: true,
      department: true,
      specialization: true,
      createdAt: true,
      lastLoginAt: true
    },
    orderBy: { createdAt: "desc" }
  });
}
