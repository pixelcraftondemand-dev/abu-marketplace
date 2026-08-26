import AgentLayout from "@/components/agent/AgentLayout";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata = {
    title: "AMBER PAY - Agent Dashboard",
    description: "AMBER PAY Agent Portal - Process deposits and manage cash-in requests",
};

export default async function AgentRootLayout({ children }) {
    const { userId } = await auth();

    if (!userId) {
        redirect("/sign-in");
    }

    return <AgentLayout>{children}</AgentLayout>;
}
