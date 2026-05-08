import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Tenant",
      slug: "default",
      isActive: true,
    },
  });

  console.log(`✅ Tenant criado: ${tenant.name} (ID: ${tenant.id})`);
  console.log(`💡 Use esse ID no header X-Tenant-ID: ${tenant.id}`);
  console.log(`💡 Ou use o slug: ${tenant.slug}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
