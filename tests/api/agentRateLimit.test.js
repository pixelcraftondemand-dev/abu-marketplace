// Regression test for the agent rate-limiter wiring (agentActionRateLimiter).
//
// All four /api/agent/* routes follow the same shape: Clerk session → active
// agent check → agentActionRateLimiter.check(userId) → work. This test drives
// each route handler directly (mocking only the session + database) so the real
// limiter import from @/lib/security is exercised: 30 calls are allowed per
// agent per window, the 31st returns 429.
import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => {
  const db = {
    agent: { findUnique: vi.fn() },
    withdrawalRequest: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      aggregate: vi.fn(async () => ({ _sum: { amount: null } })),
    },
    topUpRequest: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      aggregate: vi.fn(async () => ({ _sum: { amount: null } })),
    },
    agentTransaction: {
      findMany: vi.fn(async () => []),
      count: vi.fn(async () => 0),
      aggregate: vi.fn(async () => ({ _sum: { amount: null, fee: null }, _count: 0 })),
    },
    user: { findMany: vi.fn(async () => []) },
  };
  return { db };
});

vi.mock("@/lib/serverAuth", () => ({
  getSessionFromRequest: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ default: db }));

import { getSessionFromRequest } from "@/lib/serverAuth";
import { GET as getWithdrawals } from "@/app/api/agent/withdrawals/route";
import { GET as getRequests } from "@/app/api/agent/requests/route";
import { GET as getHistory } from "@/app/api/agent/history/route";
import { POST as postCashOut } from "@/app/api/agent/cash-out/route";

const ACTIVE_AGENT = { id: "agent_1", status: "active", businessName: "ABU Test Agent", floatBalance: 1000 };

function getRequest(url) {
  return new Request(`http://localhost:3000${url}`);
}

function postRequest(url) {
  return new Request(`http://localhost:3000${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}), // invalid cash-out body → 400 when allowed
  });
}

/**
 * Calls `caller` up to 35 times and asserts the very first 429 appears on the
 * 31st call (limiter budget is 30 per 60s window), returning the 429 response.
 */
async function expectLimitedOn31st(caller, allowedStatus) {
  let limited = null;
  for (let i = 1; i <= 35 && !limited; i += 1) {
    const res = await caller();
    if (res.status === 429) {
      limited = { at: i, res };
      break;
    }
    expect(res.status).toBe(allowedStatus); // allowed calls must not blow up
  }

  expect(limited).not.toBeNull();
  expect(limited.at).toBe(31);
  const body = await limited.res.json();
  expect(body.error).toBe("Too many requests.");
  expect(limited.res.headers.get("retry-after")).toBeTruthy();
}

beforeEach(() => {
  vi.clearAllMocks();
  db.agent.findUnique.mockResolvedValue(ACTIVE_AGENT);
});

describe("GET /api/agent/withdrawals", () => {
  it("allows 30 calls per agent, then rate-limits with 429", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "agent_wd_user" } });
    await expectLimitedOn31st(() => getWithdrawals(getRequest("/api/agent/withdrawals")), 200);
  });
});

describe("GET /api/agent/requests", () => {
  it("allows 30 calls per agent, then rate-limits with 429", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "agent_rq_user" } });
    await expectLimitedOn31st(() => getRequests(getRequest("/api/agent/requests")), 200);
  });
});

describe("GET /api/agent/history", () => {
  it("allows 30 calls per agent, then rate-limits with 429", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "agent_hi_user" } });
    await expectLimitedOn31st(() => getHistory(getRequest("/api/agent/history")), 200);
  });
});

describe("POST /api/agent/cash-out", () => {
  it("applies the rate limit before processing the cash-out", async () => {
    getSessionFromRequest.mockResolvedValue({ user: { id: "agent_co_user" } });
    // Allowed calls pass the limiter and fail input validation (422); the 31st
    // must be stopped by the limiter itself.
    await expectLimitedOn31st(() => postCashOut(postRequest("/api/agent/cash-out")), 422);
  });
});
