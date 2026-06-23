'use client';

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
import { 
  Layers, 
  Building2, 
  Plus, 
  ArrowLeft, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown, 
  Check, 
  Search, 
  BookOpen, 
  PiggyBank, 
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface GroupOption {
  _id: string;
  groupName: string;
  type: string;
}

interface LedgerProfile {
  _id: string;
  ledgerName: string;
  groupId: GroupOption;
  openingBalance: number;
  currentBalance: number;
  createdAt: string;
}

interface DbUser {
  id: string;
  clerkUserId: string;
  email: string;
  activeCompanyId: string | null;
}

interface CompanyProfile {
  _id: string;
  companyName: string;
  state: string;
  financialYear: string;
}

// Custom accessible select dropdown mimicking ShadCN UI
interface GroupSelectProps {
  groups: GroupOption[];
  value: string;
  onChange: (val: string) => void;
  onFocusNext: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

function GroupSelect({ groups, value, onChange, onFocusNext, buttonRef }: GroupSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedGroup = groups.find(g => g._id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const idx = groups.findIndex(g => g._id === value);
      setHighlightedIdx(idx >= 0 ? idx : 0);
    }
  }, [isOpen, value, groups]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIdx(prev => (prev < groups.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIdx(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (groups[highlightedIdx]) {
          onChange(groups[highlightedIdx]._id);
          setIsOpen(false);
          // Small timeout to ensure DOM focus transitions smoothly
          setTimeout(() => {
            onFocusNext();
          }, 50);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative w-full" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-150 text-left flex justify-between items-center focus:outline-none transition-colors"
      >
        <span className={value ? "text-zinc-100 font-medium" : "text-zinc-500"}>
          {selectedGroup ? `${selectedGroup.groupName} (${selectedGroup.type})` : "Select Accounting Group"}
        </span>
        <ChevronDown className="h-4 w-4 text-zinc-500" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl p-2 max-h-[220px] overflow-y-auto space-y-0.5">
          {groups.length === 0 ? (
            <div className="text-zinc-600 text-xs py-3 text-center">Loading accounting groups...</div>
          ) : (
            groups.map((group, idx) => {
              const isSelected = value === group._id;
              const isHighlighted = idx === highlightedIdx;

              return (
                <button
                  key={group._id}
                  type="button"
                  onClick={() => {
                    onChange(group._id);
                    setIsOpen(false);
                    setTimeout(() => {
                      onFocusNext();
                    }, 50);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex justify-between items-center transition-colors ${
                    isHighlighted 
                      ? "bg-emerald-500/10 text-emerald-400 font-bold" 
                      : "text-zinc-350 hover:bg-zinc-900/60"
                  }`}
                >
                  <span>{group.groupName} <span className="text-zinc-500 text-[10px]">({group.type})</span></span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default function LedgerMasterPage() {
  const { isLoaded, userId, getToken } = useAuth();
  const router = useRouter();

  // Core Auth and Tenancy States
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [activeCompany, setActiveCompany] = useState<CompanyProfile | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');

  // Groups and Ledgers Data States
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [ledgers, setLedgers] = useState<LedgerProfile[]>([]);
  const [ledgersLoading, setLedgersLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form Inputs States
  const [ledgerName, setLedgerName] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState<string>('0');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // Refs for Tally Keyboard-First Focus Navigation
  const nameInputRef = useRef<HTMLInputElement>(null);
  const groupSelectButtonRef = useRef<HTMLButtonElement>(null);
  const balanceInputRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // 1. Sync User Profile & Fetch Active Company Detail
  useEffect(() => {
    async function syncAndFetchWorkspace() {
      if (!userId) return;
      setSyncStatus('loading');
      try {
        const token = await getToken();
        if (!token) throw new Error("Unable to retrieve Clerk session token.");

        // Sync local DB User profile
        const syncRes = await fetch("http://localhost:5000/api/user/sync", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });

        const syncData = await syncRes.json();
        if (!syncRes.ok || !syncData.success) {
          throw new Error(syncData.error || "Profile sync failed.");
        }

        setDbUser(syncData.user);
        const activeCompanyId = syncData.user.activeCompanyId;

        if (activeCompanyId) {
          // Fetch company details to display in the header
          const compRes = await fetch("http://localhost:5000/api/companies", {
            headers: { "Authorization": `Bearer ${token}` }
          });
          const compData = await compRes.json();
          if (compRes.ok && compData.success) {
            const currentCompany = compData.companies.find((c: CompanyProfile) => c._id === activeCompanyId);
            setActiveCompany(currentCompany || null);
          }
          setSyncStatus('success');
        } else {
          setSyncStatus('success'); // Completed load, but activeCompanyId is null
        }
      } catch (err: any) {
        console.error("Ledger Page Sync Error:", err);
        setSyncStatus('error');
        setErrorDetails(err.message || "Unknown error connecting to backend.");
      }
    }

    if (isLoaded && userId) {
      syncAndFetchWorkspace();
    }
  }, [isLoaded, userId, getToken]);

  // 2. Fetch Accounting Groups and Ledgers List once activeCompanyId is resolved
  const fetchGroupsAndLedgers = async () => {
    const activeCompanyId = dbUser?.activeCompanyId;
    if (!activeCompanyId) return;

    try {
      const token = await getToken();
      
      // Fetch Groups
      const groupRes = await fetch("http://localhost:5000/api/ledgers/groups", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-company-id": activeCompanyId
        }
      });
      const groupData = await groupRes.json();
      if (groupRes.ok && groupData.success) {
        setGroups(groupData.groups);
      }

      // Fetch Ledgers List
      setLedgersLoading(true);
      const ledgerRes = await fetch(`http://localhost:5000/api/ledgers?search=${encodeURIComponent(searchQuery)}`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-company-id": activeCompanyId
        }
      });
      const ledgerData = await ledgerRes.json();
      if (ledgerRes.ok && ledgerData.success) {
        setLedgers(ledgerData.ledgers);
      }
    } catch (err) {
      console.error("Error loading groups/ledgers records:", err);
    } finally {
      setLedgersLoading(false);
    }
  };

  useEffect(() => {
    if (syncStatus === 'success' && dbUser?.activeCompanyId) {
      fetchGroupsAndLedgers();
    }
  }, [syncStatus, dbUser, searchQuery]);

  // 3. Auto-focus Ledger Name Input when component mounts
  useEffect(() => {
    if (syncStatus === 'success' && dbUser?.activeCompanyId) {
      // Small timeout to allow input element to render completely
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [syncStatus, dbUser]);

  // 4. Global keydown listener for Esc to route back to Dashboard
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Prevent default browser behavior
        e.preventDefault();
        router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [router]);

  // 5. Submit Ledger Form handler
  const handleCreateLedger = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    const activeCompanyId = dbUser?.activeCompanyId;
    if (!activeCompanyId) return;

    if (!ledgerName || !ledgerName.trim()) {
      setFormError("Ledger name is required.");
      nameInputRef.current?.focus();
      return;
    }

    if (!groupId) {
      setFormError("Please select a parent accounting group.");
      groupSelectButtonRef.current?.focus();
      return;
    }

    setFormSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const token = await getToken();
      const res = await fetch("http://localhost:5000/api/ledgers/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-company-id": activeCompanyId
        },
        body: JSON.stringify({
          ledgerName: ledgerName.trim(),
          groupId,
          companyId: activeCompanyId,
          openingBalance: Number(openingBalance) || 0
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFormSuccess(`Ledger "${ledgerName.trim()}" created successfully.`);
        // Reset Inputs
        setLedgerName('');
        setGroupId('');
        setOpeningBalance('0');
        // Refresh Ledgers List
        await fetchGroupsAndLedgers();
        // Redirect focus back to start
        nameInputRef.current?.focus();
      } else {
        setFormError(data.error || "Failed to create ledger.");
      }
    } catch (err: any) {
      setFormError(err.message || "Network error. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // 6. Keyboard navigation handlers inside the form
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (ledgerName.trim() !== '') {
        groupSelectButtonRef.current?.focus();
      } else {
        setFormError("Ledger name is required.");
      }
    }
  };

  const handleBalanceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateLedger();
    }
  };

  // Loading Screen
  if (!isLoaded || syncStatus === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" /> Initializing Masters environment...
      </div>
    );
  }

  // Error Synchronization UI
  if (syncStatus === 'error') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl border border-red-900/30 bg-red-950/10 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Workspace Connection Failure</h2>
          <p className="text-zinc-400 text-sm mb-6">{errorDetails}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm font-semibold transition-all"
          >
            Retry Sync
          </button>
        </div>
      </div>
    );
  }

  // Isolation Guard: No Active Company Selected
  if (!dbUser?.activeCompanyId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-3xl border border-zinc-900 bg-zinc-950 text-center space-y-6">
          <div className="bg-emerald-500/10 p-5 rounded-2xl w-fit mx-auto border border-emerald-500/15">
            <Building2 className="h-10 w-10 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">No Active Company Context</h2>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Ledger records require strict tenant isolation. Please select or establish a company from the main dashboard dashboard first.
            </p>
          </div>
          <Link 
            href="/dashboard"
            className="w-full inline-flex py-3 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-xl text-sm justify-center items-center gap-2 transition-all transform hover:-translate-y-0.5 shadow-lg shadow-emerald-500/10"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-teal-500/5 blur-[150px] pointer-events-none"></div>

      {/* Nav Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-emerald-500 to-teal-400 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
                <Layers className="h-6 w-6 text-zinc-950 stroke-[2.5]" />
              </div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                Smart<span className="text-emerald-400">ERP</span>
              </span>
            </Link>
            {activeCompany && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-4">
                <Building2 className="h-3 w-3" /> Active: {activeCompany.companyName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard"
              className="px-4 py-2 border border-zinc-900 bg-zinc-950 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-500 font-mono text-[9px] ml-1">Esc</kbd>
            </Link>
          </div>
        </div>
      </header>

      {/* Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 relative z-10">
        
        {/* Breadcrumb Info */}
        <div className="mb-8 flex items-center gap-2 text-xs text-zinc-550 font-bold uppercase tracking-wider">
          <span>Gateway of SmartERP</span>
          <span>&gt;</span>
          <span>Masters</span>
          <span>&gt;</span>
          <span className="text-emerald-400">Ledger Creation</span>
        </div>

        {/* Split Screen Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT PANEL: Ledger Creation Form (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl space-y-6">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-100">
                <Plus className="h-5 w-5 text-emerald-400" /> Create Ledger
              </h2>
              <p className="text-zinc-500 text-xs mt-1">Add a new financial account ledger to compile transactions.</p>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/10 text-red-400 text-xs flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Creation Failed</p>
                  <p className="text-red-500/80 mt-0.5">{formError}</p>
                </div>
              </div>
            )}

            {/* Success Banner */}
            {formSuccess && (
              <div className="p-4 rounded-xl border border-emerald-550/10 bg-emerald-500/5 text-emerald-400 text-xs flex items-center gap-2.5 animate-fade-in">
                <Check className="h-4.5 w-4.5 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateLedger} className="space-y-5">
              
              {/* Field 1: Name */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block font-semibold uppercase tracking-wider">LEDGER NAME *</label>
                <input 
                  ref={nameInputRef}
                  type="text" 
                  required
                  placeholder="e.g. State Bank of India"
                  value={ledgerName}
                  onChange={(e) => setLedgerName(e.target.value)}
                  onKeyDown={handleNameKeyDown}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Field 2: Group Select */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block font-semibold uppercase tracking-wider">UNDER ACCOUNT GROUP *</label>
                <GroupSelect 
                  groups={groups} 
                  value={groupId} 
                  onChange={setGroupId} 
                  onFocusNext={() => balanceInputRef.current?.focus()}
                  buttonRef={groupSelectButtonRef}
                />
              </div>

              {/* Field 3: Opening Balance */}
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-400 block font-semibold uppercase tracking-wider">OPENING BALANCE (INR)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm text-zinc-500">₹</span>
                  <input 
                    ref={balanceInputRef}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    onKeyDown={handleBalanceKeyDown}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl pl-8 pr-4 py-3 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {/* Tally Keyboard Help banner */}
              <div className="p-3 rounded-xl bg-zinc-900/30 border border-zinc-900 text-[10px] text-zinc-500 leading-normal">
                <p className="font-bold text-zinc-400 uppercase tracking-wider mb-1">Keyboard Navigation Guide:</p>
                <ul className="list-disc list-inside space-y-0.5 text-zinc-500">
                  <li>Press <kbd className="px-1 py-0.5 rounded bg-zinc-850 text-zinc-300 font-mono text-[9px]">TAB</kbd> to jump forward.</li>
                  <li>Press <kbd className="px-1 py-0.5 rounded bg-zinc-850 text-zinc-300 font-mono text-[9px]">Shift + TAB</kbd> to step backward.</li>
                  <li>Press <kbd className="px-1 py-0.5 rounded bg-zinc-850 text-zinc-300 font-mono text-[9px]">ENTER</kbd> on any field to progress or trigger submission.</li>
                </ul>
              </div>

              {/* Actions */}
              <button 
                ref={submitButtonRef}
                type="submit"
                disabled={formSubmitting}
                className="w-full py-4 bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-900 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 disabled:transform-none shadow-lg shadow-emerald-500/10"
              >
                {formSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-zinc-950 mr-1" />
                ) : (
                  <Plus className="h-4 w-4 text-zinc-950 stroke-[3]" />
                )} 
                Sync & Save Ledger (Enter)
              </button>

            </form>
          </div>

          {/* RIGHT PANEL: Ledgers Database List (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl space-y-6 min-h-[480px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-zinc-100">
                  <BookOpen className="h-5 w-5 text-emerald-400" /> Chart of Ledgers
                </h2>
                <p className="text-zinc-500 text-xs mt-1">View and filter ledgers configured under this company.</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-60">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-550" />
                <input 
                  type="text" 
                  placeholder="Search ledger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/30 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Ledgers List */}
            {ledgersLoading ? (
              <div className="flex items-center justify-center py-20 text-zinc-500 text-sm">
                <RefreshCw className="h-5 w-5 animate-spin text-emerald-400 mr-2" /> Syncing with ledger vault...
              </div>
            ) : ledgers.length === 0 ? (
              <div className="border border-dashed border-zinc-900 rounded-2xl p-16 flex flex-col items-center justify-center text-center">
                <FileSpreadsheet className="h-8 w-8 text-zinc-700 mb-4 stroke-[1.5]" />
                <h3 className="text-sm font-bold text-zinc-305">No Ledgers Created</h3>
                <p className="text-zinc-500 text-xs max-w-xs mt-1 leading-normal">
                  {searchQuery ? "No ledgers matched your filter. Try a different query." : "Setup your first account ledger to begin organizing voucher transactions."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-zinc-900 text-[10px] text-zinc-550 font-bold uppercase tracking-wider">
                      <th className="pb-3 pl-2">Ledger Name</th>
                      <th className="pb-3">Under Group</th>
                      <th className="pb-3 text-right">Opening Balance</th>
                      <th className="pb-3 text-right pr-2">Current Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/40 text-xs">
                    {ledgers.map((ledger) => (
                      <tr 
                        key={ledger._id} 
                        className="hover:bg-zinc-900/20 transition-colors group"
                      >
                        <td className="py-3.5 pl-2 font-semibold text-zinc-200 group-hover:text-emerald-400 transition-colors">
                          {ledger.ledgerName}
                        </td>
                        <td className="py-3.5">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">
                            {ledger.groupId?.groupName || "Unknown"}
                          </span>
                        </td>
                        <td className="py-3.5 text-right font-mono text-zinc-450">
                          ₹{ledger.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3.5 text-right font-mono text-emerald-400 font-bold pr-2">
                          ₹{ledger.currentBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Total Summary Footer inside chart */}
            {!ledgersLoading && ledgers.length > 0 && (
              <div className="flex justify-between items-center bg-zinc-900/20 border border-zinc-900 p-4 rounded-2xl text-[11px] text-zinc-500 font-medium">
                <span>Total Ledgers Configured: <strong className="text-zinc-300 font-bold">{ledgers.length}</strong></span>
                <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Multi-Tenant Sandboxing Active</span>
              </div>
            )}

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-zinc-650 text-xs mt-auto">
        <p>© 2026 SmartERP. Day 5 Complete: Ledger Masters Configuration.</p>
      </footer>
    </div>
  );
}
