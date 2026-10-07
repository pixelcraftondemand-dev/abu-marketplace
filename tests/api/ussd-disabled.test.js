import { describe, expect, it } from "vitest";

import { GET, POST } from "@/app/api/ussd/route";

describe("USSD wallet service while disabled", () => {
  it("reports unavailable to health checks", async () => {
    const response = await GET();
    expect(response.status).toBe(410);
    expect(await response.text()).toContain("Wallet services are temporarily unavailable.");
  });

  it("ends incoming USSD sessions with an unavailable message", async () => {
    const response = await POST();
    expect(response.status).toBe(410);
    expect(await response.text()).toContain("END Wallet services are temporarily unavailable.");
  });
});
