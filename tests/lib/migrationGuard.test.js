import { describe, it, expect } from "vitest";
import { classifyMigration, splitStatements } from "@/lib/migrationGuard.mjs";

describe("migrationGuard", () => {
  it("treats an empty / comment-only diff as safe and empty", () => {
    const result = classifyMigration("-- This is an empty migration.\n");
    expect(result.safe).toBe(true);
    expect(result.summary.total).toBe(0);
  });

  it("allows additive-only statements (CREATE TABLE, ADD COLUMN, indexes, enums, FKs)", () => {
    const sql = `
      -- CreateTable
      CREATE TABLE "Rating" (
        "id" TEXT NOT NULL,
        "productId" TEXT NOT NULL,
        CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
      );

      -- AlterTable
      ALTER TABLE "Product" ADD COLUMN "halalCertified" BOOLEAN NOT NULL DEFAULT false;

      -- CreateIndex
      CREATE UNIQUE INDEX "Store_username_key" ON "Store"("username");

      -- CreateEnum
      CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

      -- AlterEnum
      ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

      -- AddForeignKey
      ALTER TABLE "Rating" ADD CONSTRAINT "Rating_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE;
    `;
    const result = classifyMigration(sql);
    expect(result.safe).toBe(true);
    expect(result.summary.total).toBe(6);
    expect(result.summary.unsafe).toBe(0);
  });

  it("blocks DROP TABLE and DROP COLUMN", () => {
    const sql = `
      -- DropTable
      DROP TABLE "Rating";

      -- AlterTable
      ALTER TABLE "Product" DROP COLUMN "halalCertified";
    `;
    const result = classifyMigration(sql);
    expect(result.safe).toBe(false);
    expect(result.destructive.length).toBe(2);
    expect(result.destructive[0].label).toContain("DROP");
  });

  it("blocks type changes (ALTER COLUMN ... TYPE)", () => {
    const sql = `ALTER TABLE "Product" ALTER COLUMN "price" TYPE BIGINT;`;
    const result = classifyMigration(sql);
    expect(result.safe).toBe(false);
    expect(result.destructive[0].label).toContain("TYPE");
  });

  it("blocks the SET DATA TYPE spelling of a type change (destructive)", () => {
    // Prisma emits `TYPE`, but `SET DATA TYPE` is valid PostgreSQL and must not
    // be let through by the loose `SET` match — this was a guard bypass.
    const sql = `ALTER TABLE "Product" ALTER COLUMN "price" SET DATA TYPE BIGINT;`;
    const result = classifyMigration(sql);
    expect(result.safe).toBe(false);
    expect(result.destructive[0].label).toContain("TYPE");
  });

  it("allows SET NOT NULL / SET DEFAULT (additive constraints)", () => {
    const result = classifyMigration(
      `ALTER TABLE "Order" ALTER COLUMN "paymentId" SET DEFAULT 'cash';`,
    );
    expect(result.safe).toBe(true);
    const notNull = classifyMigration(
      `ALTER TABLE "Product" ALTER COLUMN "stock" SET NOT NULL;`,
    );
    expect(notNull.safe).toBe(true);
  });

  it("allows idempotent statements (IF NOT EXISTS)", () => {
    const sql = `
      CREATE TABLE IF NOT EXISTS "Rating" ("id" TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS "Store_username_key" ON "Store"("username");
      ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "halalCertified" BOOLEAN;
    `;
    const result = classifyMigration(sql);
    expect(result.safe).toBe(true);
    expect(result.summary.total).toBe(3);
  });

  it("blocks DELETE and TRUNCATE", () => {
    const result = classifyMigration(`DELETE FROM "Product";`);
    expect(result.safe).toBe(false);
    const truncate = classifyMigration(`TRUNCATE "Order";`);
    expect(truncate.safe).toBe(false);
  });

  it("blocks unknown / unrecognized statements (fail-closed)", () => {
    const result = classifyMigration(`ALTER TABLE "Product" RENAME TO "Products";`);
    expect(result.safe).toBe(false);
  });

  it("splitStatements strips comment lines and blanks", () => {
    const stmts = splitStatements("-- a comment\n\nCREATE TABLE a (id int);\n-- another\nDROP TABLE b;");
    expect(stmts).toEqual([
      "CREATE TABLE a (id int)",
      "DROP TABLE b",
    ]);
  });
});
