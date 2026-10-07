import { clerkClient } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import type { EmailOtpIntent } from "@/lib/services/emailOtpService";

const TICKET_TTL_SECONDS = 120;

type EmailAuthResult =
  | { ok: true; ticket: string }
  | { ok: false; reason: "account_not_found" | "account_exists" | "account_disabled" };

async function findUserIdByEmail(email: string): Promise<string | null> {
  const client = await clerkClient();
  const { data } = await client.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  return data[0]?.id ?? null;
}

export async function createEmailSignInTicket(
  email: string,
  intent: EmailOtpIntent
): Promise<EmailAuthResult> {
  const client = await clerkClient();
  let userId = await findUserIdByEmail(email);

  if (intent === "signUp" && userId) {
    return { ok: false, reason: "account_exists" };
  }
  if (intent === "signIn" && !userId) {
    return { ok: false, reason: "account_not_found" };
  }

  if (!userId) {
    try {
      const created = await client.users.createUser({
        emailAddress: [email],
        skipPasswordRequirement: true,
      });
      userId = created.id;
    } catch (error) {
      userId = await findUserIdByEmail(email);
      if (!userId) throw error;
    }
  }

  const user = await client.users.getUser(userId);
  const emailResource = user.emailAddresses.find(
    (address) => address.emailAddress.toLowerCase() === email
  );
  if (!emailResource) {
    throw new Error("Verified email address was not attached to the Clerk user.");
  }
  if (emailResource.verification?.status !== "verified") {
    await client.emailAddresses.updateEmailAddress(emailResource.id, {
      verified: true,
    });
  }

  const databaseUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { deletedAt: true },
  });
  if (databaseUser?.deletedAt) {
    return { ok: false, reason: "account_disabled" };
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    email.split("@")[0];
  await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId,
      name: displayName,
      email,
      image: user.imageUrl || "",
      cart: {},
      emailVerified: true,
    },
    update: { email, emailVerified: true },
  });

  const { token } = await client.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: TICKET_TTL_SECONDS,
  });

  return { ok: true, ticket: token };
}
