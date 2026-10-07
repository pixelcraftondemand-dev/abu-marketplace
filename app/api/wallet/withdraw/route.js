import { walletUnavailableResponse } from "@/lib/walletDisabled";

export function POST() {
  return walletUnavailableResponse();
}
