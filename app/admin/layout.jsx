import AdminLayout from "@/components/admin/AdminLayout";
import { SignIn, Show } from "@clerk/nextjs"

export const metadata = {
    title: "ABU Marketplace - Admin",
    description: "ABU Marketplace - Admin",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <Show when={(auth) => !!auth.userId}>
                <AdminLayout>
                {children}
                </AdminLayout>
            </Show>
            <Show when={(auth) => !auth.userId}>
                <div className="min-h-screen flex items-center justify-center">
                    <SignIn fallbackRedirectUrl="/admin" routing="hash"/>
                </div>
            </Show>
        </>
    );
}