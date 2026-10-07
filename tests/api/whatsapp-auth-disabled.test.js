import { describe, expect, it } from "vitest";

import { POST as sendCode } from "@/app/api/auth/whatsapp/send/route";
import { POST as verifyCode } from "@/app/api/auth/whatsapp/verify/route";

describe("WhatsApp authentication while disabled", () => {
  it.each([
    ["send code", sendCode],
    ["verify code", verifyCode],
  ])("returns 410 for %s", async (_operation, handler) => {
    const response = await handler();
    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: "WhatsApp sign-in is temporarily unavailable.",
    });
  });
});
