import AdminLayout from "@/components/admin/AdminLayout";
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export const metadata = {
    title: "ABU Marketplace - Admin",
    description: "ABU Marketplace - Admin",
};

export default async function RootAdminLayout({ children }) {
    const { userId } = await auth()

    if (!userId) {
        redirect('/sign-in')
    }

    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    );
}