import AdminLayout from "@/components/admin/AdminLayout";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "ABU Marketplace - Admin Support",
  description: "ABU Marketplace support tickets",
};

export default async function AdminSupportLayout({ children }) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return <AdminLayout>{children}</AdminLayout>;
}
