'use client';

import { useAuth, useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Layers, Database, UserCheck, RefreshCw, AlertCircle } from "lucide-react";
import Link from "next/link";

interface DbUser {
  id: string;
  clerkUserId: string;
  email: string;
  activeCompanyId: string | null;
}

export default function DashboardPage() {
  const { isLoaded, userId, getToken } = useAuth();
  const { user } = useUser();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    async function syncUser() {
      if (!userId) return;
      
      setSyncStatus('loading');
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("Unable to retrieve Clerk session token.");
        }

        const res = await fetch("http://localhost:5000/api/user/sync", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        const data = await res.json();
        
        if (res.ok && data.success) {
          setDbUser(data.user);
          setSyncStatus('success');
        } else {
          const errMsg = data.details 
            ? `${data.error} (Details: ${data.details})` 
            : (data.error || "Failed to synchronize profile.");
          throw new Error(errMsg);
        }
      } catch (err: any) {
        console.error("Sync Error:", err);
        setSyncStatus('error');
        setErrorDetails(err.message || "Unknown error connecting to backend.");
      }
    }

    if (isLoaded && userId) {
      syncUser();
    }
  }, [isLoaded, userId, getToken]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" /> Loading session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none"></div>

      {/* Nav Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                <Layers className="h-6 w-6 text-zinc-950 stroke-[2.5]" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Smart<span className="text-emerald-400">ERP</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 relative z-10 flex flex-col justify-center">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Workspace Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">Manage your cloud ledger and tenant configurations.</p>
        </div>

        {/* Status Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Clerk Auth Profile */}
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <UserCheck className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">Clerk Authenticated Session</h2>
              </div>
              
              <div className="space-y-3 mt-6">
                <div>
                  <span className="text-xs text-zinc-500 block">CLERK USER ID</span>
                  <span className="text-sm font-mono text-zinc-350 select-all">{userId}</span>
                </div>
                <div>
                  <span className="text-xs text-zinc-500 block">EMAIL ADDRESS</span>
                  <span className="text-sm text-zinc-350">{user?.primaryEmailAddress?.emailAddress || 'Resolving email...'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MongoDB Synchronized Profile */}
          <div className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 backdrop-blur-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-semibold">MongoDB Synchronized Context</h2>
              </div>

              <div className="mt-6">
                {syncStatus === 'loading' && (
                  <div className="flex items-center text-sm text-zinc-400">
                    <RefreshCw className="h-4 w-4 animate-spin text-emerald-400 mr-2" />
                    Connecting to backend & syncing database...
                  </div>
                )}

                {syncStatus === 'success' && dbUser && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-zinc-500 block font-semibold text-emerald-400">DATABASE USER ID (MONGO _ID)</span>
                      <span className="text-sm font-mono text-zinc-350 select-all">{dbUser.id}</span>
                    </div>
                    <div>
                      <span className="text-xs text-zinc-500 block font-semibold text-emerald-400">ACTIVE TENANT COMPANY</span>
                      <span className="text-sm text-zinc-350">
                        {dbUser.activeCompanyId ? dbUser.activeCompanyId : 'None (No active tenant resolved)'}
                      </span>
                    </div>
                  </div>
                )}

                {syncStatus === 'error' && (
                  <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/10 text-red-400 text-sm flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Sync Failed</p>
                      <p className="text-xs text-red-500/80 mt-1">{errorDetails}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-6 border-t border-zinc-900/60 pt-4 flex items-center justify-between text-xs text-zinc-500">
              <span>Backend status:</span>
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Connected
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-zinc-600 text-xs mt-auto">
        <p>© 2026 SmartERP. Day 2 Complete: Clerk Multi-Tenant Auth Guard.</p>
      </footer>
    </div>
  );
}
