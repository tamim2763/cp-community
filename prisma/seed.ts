import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const passwordHash = await bcrypt.hash("admin123456", 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Admin",
      role: UserRole.ADMIN,
      passwordHash,
    },
    create: {
      name: "Admin",
      email: adminEmail,
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  await prisma.resourceCategory.upsert({
    where: { slug: "problem-solving-sheets" },
    update: {},
    create: {
      name: "Problem Solving Sheets",
      slug: "problem-solving-sheets",
      description: "Curated lists, sheets, and practice plans for CP students.",
    },
  });

  console.log("Seed complete");
  console.log(`Admin login: ${adminEmail} / admin123456`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
