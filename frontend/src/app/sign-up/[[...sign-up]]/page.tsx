import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <div className="relative w-full max-w-md animate-fade-in">
        {/* Soft decorative glow background */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-20 blur-xl"></div>
        <div className="relative flex justify-center">
          <SignUp 
            routing="path" 
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/dashboard"
          />
        </div>
      </div>
    </main>
  );
}
