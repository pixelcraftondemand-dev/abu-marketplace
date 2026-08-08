import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL = "file:./prisma/dev.db";
const p = new PrismaClient();

for (const model of ["product", "store", "user", "order", "address", "coupon"]) {
  try {
    const count = await p[model].count();
    console.log(`${model}: ${count}`);
  } catch (e) {
    console.log(`${model}: ERR ${e.message.slice(0, 100)}`);
  }
}
await p.$disconnect();
