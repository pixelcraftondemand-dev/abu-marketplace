import StoreLayout from "@/components/store/StoreLayout";
import { SignIn } from "@clerk/nextjs"
import { SignedIn, SignedOut } from "@clerk/nextjs/components"

export const metadata = {
    title: "GoCart. - Store Dashboard",
    description: "GoCart. - Store Dashboard",
};

export default function RootAdminLayout({ children }) {

    return (
        <>  
        <SignedIn>
            <StoreLayout>
                {children}
            </StoreLayout>
        </SignedIn>
        <SignedOut>
            <div className="min-h-screen flex items-center justify-center">
                <SignIn fallbackRedirectUrl="/store" routing="hash" />
            </div>
        </SignedOut>
            
        </>
    );
}