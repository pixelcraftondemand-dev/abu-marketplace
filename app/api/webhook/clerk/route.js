import { createClerkClient } from "@clerk/backend"
import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

export async function POST() {
  const prisma = new PrismaClient()

  try {
    const clerk = createClerkClient({
      secretKey: process.env.CLERK_SECRET_KEY,
    })

    const { data: users } = await clerk.users.getUserList({ limit: 100 })

    for (const user of users) {
      await prisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          email: user.emailAddresses[0]?.emailAddress ?? "",
          image: user.imageUrl ?? "",
        },
      })
      console.log(`Synced: ${user.emailAddresses[0]?.emailAddress}`)
    }

    return NextResponse.json({ message: "Backfill complete" })
  } catch (error) {
    console.error("[POST /api/webhook/clerk]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
