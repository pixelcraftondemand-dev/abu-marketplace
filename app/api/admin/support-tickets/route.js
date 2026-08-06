import authAdmin from "@/middlewares/authAdmin";
import { getSessionFromRequest } from "@/lib/serverAuth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const session = await getSessionFromRequest(request);
    const userId = session?.user?.id;
    const isAdmin = await authAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }

    const tickets = await prisma.supportTicket.findMany({
      orderBy: { updatedAt: "desc" },
      // Explicit field list — never surface the access-token hash (or other
      // internal columns) to the admin frontend; it is not needed there.
      select: {
        id: true,
        userId: true,
        subject: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, sender: true, content: true, createdAt: true },
        },
      },
    });

    const formattedTickets = tickets.map((ticket) => ({
      ...ticket,
      latestMessage: ticket.messages.length ? ticket.messages[ticket.messages.length - 1].content : null,
    }));

    return NextResponse.json({ tickets: formattedTickets });
  } catch (error) {
    console.error("[GET /api/admin/support-tickets]", error);
    return NextResponse.json({ error: "Unable to fetch support tickets." }, { status: 500 });
  }
}
