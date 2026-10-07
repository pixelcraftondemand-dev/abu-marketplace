import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SsoCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <AuthenticateWithRedirectCallback />
    </main>
  );
}
