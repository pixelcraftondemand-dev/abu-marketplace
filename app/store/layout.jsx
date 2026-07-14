import StoreLayout from "@/components/store/StoreLayout";
import { headers } from "next/headers";
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth";

export const metadata = {
    title: "ABU Marketplace - Store Dashboard",
    description: "ABU Marketplace - Store Dashboard",
};

export default async function RootStoreLayout({ children }) {
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
        <StoreLayout>
            {children}
        </StoreLayout>
    );
}