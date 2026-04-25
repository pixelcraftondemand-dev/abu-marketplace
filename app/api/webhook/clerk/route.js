import { Webhook } from "svix"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"

export async function POST(req) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) throw new Error("Missing CLERK_WEBHOOK_SECRET")

  const headerPayload = headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)
  let evt

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    })
  } catch (err) {
    return new Response("Invalid signature", { status: 400 })
  }

  if (evt.type === "user.created") {
    const { id, first_name, last_name, email_addresses, image_url } = evt.data

    await prisma.user.create({
      data: {
        id,
        name: `${first_name ?? ""} ${last_name ?? ""}`.trim(),
        email: email_addresses[0]?.email_address ?? "",
        image: image_url ?? "",
      },
    })
  }

  return new Response("OK", { status: 200 })
}