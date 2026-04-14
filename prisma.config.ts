import { defineConfig, env } from "@prisma/config"
import * as dotenv from "dotenv"

// Muat variabel dari .env.local untuk Prisma CLI
dotenv.config({ path: ".env.local" })

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL || env("DATABASE_URL"),
  },
})