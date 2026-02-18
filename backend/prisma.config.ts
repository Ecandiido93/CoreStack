/// <reference types="node" />

import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaClient } from "@prisma/client";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  }
});

