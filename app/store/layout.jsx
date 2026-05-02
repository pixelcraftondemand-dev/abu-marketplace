import StoreLayout from "@/components/store/StoreLayout";
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export const metadata = {
    title: "ABU Marketplace - Store Dashboard",
    description: "ABU Marketplace - Store Dashboard",
};

export default async function RootStoreLayout({ children }) {
    const { userId } = await auth()

    if (!userId) {
        redirect('/sign-in')
    }

    return (
        <StoreLayout>
            {children}
        </StoreLayout>
    );
}