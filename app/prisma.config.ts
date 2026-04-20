import "dotenv/config";
import { defineConfig } from "prisma/config";

// When running control-plane operations, set PRISMA_CONTROL=1 to use CONTROL_DATABASE_URL
const isControl = process.env.PRISMA_CONTROL === "1"

export default defineConfig({
  schema: isControl ? "prisma/schema.control.prisma" : "prisma/schema.prisma",
  migrations: {
    path: isControl ? "prisma/migrations-control" : "prisma/migrations",
    seed: isControl ? "tsx prisma/seed.control.ts" : "tsx prisma/seed.ts",
  },
  datasource: {
    url: isControl
      ? process.env["CONTROL_DATABASE_URL"]
      : process.env["DATABASE_URL"] ?? process.env["CONTROL_DATABASE_URL"],
  },
});
