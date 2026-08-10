import { NextResponse } from "next/server";
import { getPrismaErrorCounters } from "@/lib/prismaErrorCounters";

/**
 * Minimal observability endpoint for the post-deploy smoke battery (check
 * #12 in scripts/prod-smoke.sh): the CI runner cannot reach Vercel's runtime
 * logs, so the app exposes its own per-instance Prisma error counters after
 * the rate-limit hammer and the smoke check asserts zero unexpected errors.
 *
 * Counts only — no messages, queries, paths or stack traces are ever
 * exposed. Counters are per-instance (serverless), so this must not be used
 * as a cluster-wide health signal.
 */
export async function GET() {
    return NextResponse.json(getPrismaErrorCounters());
}
