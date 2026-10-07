import { describe, expect, it } from "vitest";

import { GET as getBalance } from "@/app/api/wallet/balance/route";
import { GET as getTransactions } from "@/app/api/wallet/transactions/route";
import { POST as postTopup } from "@/app/api/wallet/topup/route";
import { POST as postWithdraw } from "@/app/api/wallet/withdraw/route";
import { POST as postTransfer } from "@/app/api/wallet/transfer/route";
import { POST as postPaymentCode } from "@/app/api/wallet/payment-code/route";
import { GET as getPaymentCodeStatus } from "@/app/api/wallet/payment-code/status/route";
import { POST as postMobileMoney } from "@/app/api/payments/mobile-money/route";

const disabledEndpoints = [
  ["balance", getBalance],
  ["transactions", getTransactions],
  ["top-up", postTopup],
  ["withdrawal", postWithdraw],
  ["transfer", postTransfer],
  ["payment code", postPaymentCode],
  ["payment-code status", getPaymentCodeStatus],
  ["mobile-money funding", postMobileMoney],
];

describe("wallet API while wallet services are disabled", () => {
  it.each(disabledEndpoints)(
    "returns 410 for %s",
    async (_endpoint, handler) => {
      const response = await handler();
      expect(response.status).toBe(410);
      expect(await response.json()).toEqual({
        error: "Wallet services are temporarily unavailable.",
      });
    }
  );
});
