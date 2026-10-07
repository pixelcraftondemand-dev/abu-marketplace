import { NextResponse } from "next/server";

export function walletUnavailableResponse() {
  return NextResponse.json(
    { error: "Wallet services are temporarily unavailable." },
    { status: 410 }
  );
}
