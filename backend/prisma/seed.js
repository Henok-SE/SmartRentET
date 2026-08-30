require("dotenv/config");

const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const bcrypt = require("bcryptjs");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Starting database seed...");

  const passwordHash = await bcrypt.hash("SmartRent@123", 12);

  const superAdminUser = await prisma.user.upsert({
    where: {
      username: "superadmin",
    },
    update: {
      firstName: "SmartRent",
      lastName: "System Administrator",
      passwordHash: passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      nationalId: "SA000001",
      email: "superadmin@smartrent.et",
    },
    create: {
      firstName: "SmartRent",
      lastName: "System Administrator",
      username: "superadmin",
      email: "superadmin@smartrent.et",
      phone: "+251900000000",
      nationalId: "SA000001",
      passwordHash: passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      mfaEnabled: false,
    },
  });

  await prisma.superAdmin.upsert({
    where: {
      userId: superAdminUser.userId,
    },
    update: {},
    create: {
      userId: superAdminUser.userId,
    },
  });

  console.log("Super Admin seeded successfully");
  console.log("User ID:", superAdminUser.userId);
  console.log("Username:", superAdminUser.username);
  console.log("Password: SmartRent@123");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });