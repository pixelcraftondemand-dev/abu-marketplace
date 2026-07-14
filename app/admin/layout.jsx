import AdminLayout from "@/components/admin/AdminLayout";
import { headers } from "next/headers";
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth";

export const metadata = {
    title: "ABU Marketplace - Admin",
    description: "ABU Marketplace - Admin",
};

export default async function RootAdminLayout({ children }) {
    const headersList = headers();
    const cookieHeader = headersList.get("cookie");
    
    const session = await auth.api.getSession({
        headers: {
            cookie: cookieHeader,
        },
    });

    if (!session?.user?.id) {
        redirect('/sign-in')
    }

    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    );
}