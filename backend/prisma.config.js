require("dotenv").config();

const { defineConfig } = require("prisma/config");

module.exports = defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
  // Add this to increase transaction timeout
  engine: {
    interactiveTransactionTimeout: 1800000, // 30 minutes
  },
});