import { createClerkClient } from "@clerk/backend"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const clerk = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
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

await prisma.$disconnect()
console.log("Backfill complete")