import { NextResponse } from "next/server";

export function POST() {
  return NextResponse.json(
    { error: "WhatsApp sign-in is temporarily unavailable." },
    { status: 410 }
  );
}
