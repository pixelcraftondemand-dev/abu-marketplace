import { NextResponse } from "next/server";

function unavailableResponse() {
  return new NextResponse("END Wallet services are temporarily unavailable.", {
    status: 410,
    headers: { "Content-Type": "text/plain" },
  });
}

export function GET() {
  return unavailableResponse();
}

export function POST() {
  return unavailableResponse();
}
