import StoreLayout from "@/components/store/StoreLayout";
import { SignIn, Show } from "@clerk/nextjs"

export const metadata = {
    title: "GoCart. - Store Dashboard",
    description: "GoCart. - Store Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>  
        <Show when={(auth) => !!auth.userId}>
            <StoreLayout>
                {children}
            </StoreLayout>
        </Show>
        <Show when={(auth) => !auth.userId}>
            <div className="min-h-screen flex items-center justify-center">
                <SignIn fallbackRedirectUrl="/store" routing="hash" />
            </div>
        </Show>
            
        </>
    );
}