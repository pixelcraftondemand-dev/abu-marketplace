import { clerkClient } from "@clerk/nextjs/server"
import prisma from "@/lib/prisma"

const users = await clerkClient.users.getUserList()

for (const user of users.data) {
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
}

console.log("Backfill complete")