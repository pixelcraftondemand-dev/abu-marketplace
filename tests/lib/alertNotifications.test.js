import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const { mockSendEmail } = vi.hoisted(() => ({
  mockSendEmail: vi.fn().mockResolvedValue({ id: "email_1" }),
}));

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: mockSendEmail } },
}));

vi.mock("@/lib/emailUtils", () => ({
  getEmailFromAddress: vi.fn((purpose) => `ABU <${purpose}@abumarketplace.shop>`),
  escapeHtml: vi.fn((v) => String(v)),
}));

// Mock global fetch for Telegram
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { routeAlert, buildDigestEmailHtml } from "@/lib/services/alertNotifications.js";

beforeEach(() => {
  vi.resetAllMocks();
  process.env.TELEGRAM_ALERT_WEBHOOK_URL = "https://api.telegram.org/bot123:ABC/sendMessage";
  process.env.MONITORING_EMAIL_TO = "admin@abumarketplace.shop";
  process.env.MONITORING_DASHBOARD_URL = "https://admin.example.com/monitoring";
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("alertNotifications", () => {
  describe("routeAlert — critical tier", () => {
    it("sends both Telegram and email for critical alerts", async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      await routeAlert({
        metric: "ledger_balance",
        tier: "critical",
        message: "Ledger imbalance detected — $5.00 difference",
        actualValue: 5.0,
        threshold: 0.01,
        context: { totalDebit: 100, totalCredit: 95 },
      });

      // Telegram was called
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/bot123:ABC/sendMessage",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("CRITICAL ALERT"),
        })
      );

      // Email was sent
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("CRITICAL"),
          to: ["admin@abumarketplace.shop"],
        })
      );
    });
  });

  describe("routeAlert — high tier", () => {
    it("sends email only (no Telegram) for high alerts", async () => {
      await routeAlert({
        metric: "refund_rate",
        tier: "high",
        message: "Refund rate is 15%",
        actualValue: 0.15,
        threshold: 0.1,
        context: {},
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining("HIGH"),
        })
      );
    });
  });

  describe("routeAlert — medium tier", () => {
    it("does not send any immediate notification for medium alerts", async () => {
      await routeAlert({
        metric: "rate_limit_triggers",
        tier: "medium",
        message: "10 rate limit triggers",
        actualValue: 10,
        threshold: 10,
        context: {},
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });
  });

  describe("routeAlert — missing config", () => {
    it("gracefully skips when TELEGRAM_ALERT_WEBHOOK_URL is not set", async () => {
      delete process.env.TELEGRAM_ALERT_WEBHOOK_URL;
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await routeAlert({
        metric: "ledger_balance",
        tier: "critical",
        message: "test",
        actualValue: 5,
        threshold: 0.01,
        context: {},
      });

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("TELEGRAM_ALERT_WEBHOOK_URL not set")
      );
      spy.mockRestore();
    });

    it("gracefully skips when MONITORING_EMAIL_TO is not set", async () => {
      delete process.env.MONITORING_EMAIL_TO;
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await routeAlert({
        metric: "ledger_balance",
        tier: "critical",
        message: "test",
        actualValue: 5,
        threshold: 0.01,
        context: {},
      });

      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("MONITORING_EMAIL_TO not set")
      );
      spy.mockRestore();
    });
  });

  describe("buildDigestEmailHtml", () => {
    it("generates HTML with alert rows", () => {
      const alerts = [
        { metric: "rate_limit_triggers", actualValue: 15, message: "15 triggers", firedAt: "2026-08-23T10:00:00Z" },
        { metric: "idempotency_conflict_rate", actualValue: 0.12, message: "12% conflicts", firedAt: "2026-08-23T11:00:00Z" },
      ];

      const html = buildDigestEmailHtml(alerts);
      expect(html).toContain("rate_limit_triggers");
      expect(html).toContain("idempotency_conflict_rate");
      expect(html).toContain("2 medium-tier alert(s)");
    });

    it("handles empty alerts", () => {
      const html = buildDigestEmailHtml([]);
      expect(html).toContain("No medium-tier alerts");
    });
  });
});
