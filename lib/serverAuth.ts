import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

interface SessionUser {
  user: { id: string };
}

export async function getSessionFromRequest(): Promise<SessionUser | null> {
    try {
        const authResult = await auth({ acceptsToken: "any" }) as Record<string, unknown>;
        const userId = authResult?.userId as string | undefined;
        if (!userId) return null;
        return { user: { id: userId } };
    } catch (error) {
        console.error("[getSessionFromRequest]", error);
        return null;
    }
}

interface VerifiedUser {
  id: string;
  emailVerified: boolean;
  email: string | null;
  name: string | null;
}

export async function getVerifiedUserFromRequest(): Promise<VerifiedUser | null> {
    const session = await getSessionFromRequest();
    const userId = session?.user?.id;
    if (!userId) return null;

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId, deletedAt: null },
            select: { id: true, emailVerified: true, email: true, name: true },
        });
        if (!user || !user.emailVerified) return null;
        return user;
    } catch (error) {
        console.error("[getVerifiedUserFromRequest]", error);
        return null;
    }
}
