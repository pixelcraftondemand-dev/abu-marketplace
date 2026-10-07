import { walletUnavailableResponse } from "@/lib/walletDisabled";

export function GET() {
  return walletUnavailableResponse();
}
