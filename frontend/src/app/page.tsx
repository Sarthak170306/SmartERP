import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, BarChart3, ShieldCheck, Zap, Layers, RefreshCw } from "lucide-react";

export default async function Home() {
  // Check user session status on the server
  const { userId } = await auth();
  const isSigned = !!userId;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-black overflow-hidden relative">
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none"></div>

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <Layers className="h-6 w-6 text-zinc-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Smart<span className="text-emerald-400">ERP</span>
            </span>
          </div>

          <nav className="flex items-center gap-4">
            {isSigned ? (
              <Link 
                href="/dashboard" 
                className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link 
                  href="/sign-in" 
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link 
                  href="/sign-up" 
                  className="px-4 py-2 text-sm font-semibold text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-md shadow-emerald-500/10"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 text-xs font-semibold tracking-wider uppercase mb-8 backdrop-blur-sm animate-fade-in">
          <Zap className="h-3.5 w-3.5" /> Day 2 Active: Clerk Auth Synchronized
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
          Tally-Inspired. <br className="hidden md:inline" />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent">
            Cloud Powered.
          </span>
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl leading-relaxed mb-12">
          Experience lightning-fast cloud business management. A robust, secure, and multi-tenant SaaS application built for modern accounting workflow.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {isSigned ? (
            <Link 
              href="/dashboard" 
              className="group px-8 py-4 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-0.5"
            >
              Enter Dashboard
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <>
              <Link 
                href="/sign-up" 
                className="group px-8 py-4 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-xl shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-0.5"
              >
                Get Started for Free
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/sign-in" 
                className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-100 font-semibold rounded-xl transition-all duration-300"
              >
                Sign In to Account
              </Link>
            </>
          )}
        </div>

        {/* Feature Highlights */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-24">
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 backdrop-blur-sm hover:border-zinc-800 transition-colors text-left">
            <div className="bg-emerald-500/10 p-3 rounded-lg w-fit mb-4">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Clerk Authentication</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              State-of-the-art secure sign-in, sign-up, and session controls. Seamless route guards and multi-device auth security.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 backdrop-blur-sm hover:border-zinc-800 transition-colors text-left">
            <div className="bg-emerald-500/10 p-3 rounded-lg w-fit mb-4">
              <RefreshCw className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Session Syncing</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Instant backend verification and synchronization of user profile data directly to our secure MongoDB Atlas cluster.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 backdrop-blur-sm hover:border-zinc-800 transition-colors text-left">
            <div className="bg-emerald-500/10 p-3 rounded-lg w-fit mb-4">
              <BarChart3 className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Multi-Tenant Isolation</h3>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Ensures your enterprise records, ledger entries, and accounting categories are strictly sandboxed per tenant context.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-zinc-600 text-xs">
        <p>© 2026 SmartERP. Day 2 Complete: Clerk Multi-Tenant Auth Guard.</p>
      </footer>
    </div>
  );
}
