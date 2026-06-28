'use client';

import { useAuth, useUser, UserButton, useClerk } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
import { Layers, Database, UserCheck, RefreshCw, AlertCircle, Building2, Plus, ArrowRight, MapPin, FileSpreadsheet, Phone, Mail, LogOut, ArrowLeftRight, ChevronDown, Search, Check, Zap, Printer, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", 
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", 
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

interface StateComboboxProps {
  value: string;
  onChange: (val: string) => void;
}

function StateCombobox({ value, onChange }: StateComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredStates = INDIAN_STATES.filter(state =>
    state.toLowerCase().includes(search.toLowerCase())
  );

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
    setHighlightedIndex(0);
  }, [search, isOpen]);

  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector('[data-highlighted="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

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
        setHighlightedIndex(prev => 
          prev < filteredStates.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredStates[highlightedIndex]) {
          onChange(filteredStates[highlightedIndex]);
          setIsOpen(false);
          setSearch("");
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      case "Tab":
        setIsOpen(false);
        break;
    }
  };

  return (
    <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-150 text-left flex justify-between items-center focus:outline-none transition-colors"
      >
        <span className={value ? "text-zinc-100" : "text-zinc-500"}>
          {value || "Select State / UT"}
        </span>
        <ChevronDown className="h-4 w-4 text-zinc-500" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-zinc-950 border border-zinc-900 rounded-2xl shadow-2xl p-2 max-h-[220px] flex flex-col">
          <div className="relative flex items-center border-b border-zinc-900 pb-2 mb-2 px-2">
            <Search className="absolute left-5 h-4 w-4 text-zinc-650" />
            <input
              type="text"
              placeholder="Search state..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-905/50 border border-zinc-900 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/30"
              autoFocus
            />
          </div>

          <div className="overflow-y-auto flex-1 space-y-0.5" ref={listRef}>
            {filteredStates.length === 0 ? (
              <div className="text-zinc-600 text-xs py-3 text-center">
                No states found
              </div>
            ) : (
              filteredStates.map((state, idx) => {
                const isSelected = value === state;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <button
                    key={state}
                    type="button"
                    onClick={() => {
                      onChange(state);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    data-highlighted={isHighlighted}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex justify-between items-center transition-colors ${
                      isHighlighted 
                        ? "bg-emerald-500/10 text-emerald-400 font-semibold" 
                        : "text-zinc-350 hover:bg-zinc-900/60"
                    }`}
                  >
                    <span>{state}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
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
  address?: string;
  gstNumber?: string;
  financialYear: string;
  state: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
}

export default function DashboardPage() {
  const { isLoaded, userId, getToken } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  // State hooks
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [errorDetails, setErrorDetails] = useState<string>('');

  // Company State
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState<boolean>(true);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);

  // Create Company Form Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newGst, setNewGst] = useState<string>('');
  const [newFy, setNewFy] = useState<string>('2026-2027');
  const [newState, setNewState] = useState<string>('');
  const [newPhone, setNewPhone] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherType, setVoucherType] = useState('PAYMENT'); // CONTRA, PAYMENT, RECEIPT
  const [availableLedgers, setAvailableLedgers] = useState<any[]>([]);
  const [debitLedgerId, setDebitLedgerId] = useState<string>('');
  const [creditLedgerId, setCreditLedgerId] = useState<string>('');
  const [showLedgerModal, setShowLedgerModal] = useState(false);
  const [ledgerGroups, setLedgerGroups] = useState<any[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [voucherError, setVoucherError] = useState<string>('');
  
  // Day 11: Reports & Ledger Statement States
  const [statementLedgerId, setStatementLedgerId] = useState<string>('');
  const [ledgerLogs, setLedgerLogs] = useState<any[]>([]);
  
  // Day 12: Reports & Trial Balance States
  const [showTrialBalance, setShowTrialBalance] = useState(false);
  const [trialBalanceData, setTrialBalanceData] = useState<any>(null);
  const [trialBalanceLoading, setTrialBalanceLoading] = useState(false);
  
  // Day 13: Reports Search/Filters States
  const [voucherFilterType, setVoucherFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Day 4 Gateway Menu States
  const [menuIndex, setMenuIndex] = useState<number>(0);
  const [actionNotification, setActionNotification] = useState<string | null>(null);

  // useEffect Hook 1: Global Keydown Listener for Tally-inspired Keyboard navigation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Check for ALT + L shortcut (accessible globally on the dashboard)
      if (e.altKey && e.key.toLowerCase() === 'l') {
        if (activeCompanyId) {
          e.preventDefault();
          router.push('/dashboard/masters/ledgers');
        }
        return;
      }

      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowStockModal(prev => !prev);
      }

      if (!activeCompanyId) return;

      if (e.key === 'F4') { e.preventDefault(); setVoucherType('CONTRA'); setShowVoucherModal(true); }
      if (e.key === 'F5') { e.preventDefault(); setVoucherType('PAYMENT'); setShowVoucherModal(true); }
      if (e.key === 'F6') { e.preventDefault(); setVoucherType('RECEIPT'); setShowVoucherModal(true); }

      // Ignore key shortcuts if modal is open or user is typing inside an input/textarea
      if (
        showCreateModal || 
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const key = e.key.toUpperCase();

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMenuIndex(prev => (prev < menuItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMenuIndex(prev => (prev > 0 ? prev - 1 : menuItems.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        menuItems[menuIndex].action();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleSwitchCompany();
      } else {
        // Match alphabetical hotkeys
        const matchedItem = menuItems.find(item => item.hotkey === key);
        if (matchedItem) {
          e.preventDefault();
          const idx = menuItems.findIndex(item => item.hotkey === key);
          setMenuIndex(idx);
          matchedItem.action();
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeCompanyId, menuIndex, showCreateModal, companies, dbUser]);

  // useEffect Hook 2: Sync Clerk user profile with local DB
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
          setActiveCompanyId(data.user.activeCompanyId);
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

  // useEffect Hook 3: Fetch Companies once user sync is successful
  useEffect(() => {
    if (syncStatus === 'success') {
      fetchCompanies();
    }
  }, [syncStatus]);

  // Day 9: Fetch company ledgers for voucher entries
  async function fetchCompanyLedgers() {
    if (!activeCompanyId) return;
    try {
      const res = await fetch("http://localhost:5000/api/ledgers/list", {
        method: "GET",
        headers: {
          "x-company-id": activeCompanyId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableLedgers(data);
        if (data.length > 0) {
          setDebitLedgerId(data[0]._id);
          setCreditLedgerId(data.length > 1 ? data[1]._id : data[0]._id);
        }
      } else {
        console.error("Failed to fetch available ledgers");
      }
    } catch (err) {
      console.error("Error fetching ledgers:", err);
    }
  }

  useEffect(() => {
    if (showVoucherModal) {
      setVoucherError('');
    }
    if (activeCompanyId) {
      fetchCompanyLedgers();
    }
  }, [showVoucherModal, activeCompanyId]);

  // Day 11 & Day 13: Fetch ledger statement with query search filters
  async function fetchLedgerStatement(ledgerId: string, filterType?: string, search?: string) {
    if (!ledgerId || !activeCompanyId) {
      setLedgerLogs([]);
      return;
    }
    try {
      const token = await getToken();
      const fType = filterType !== undefined ? filterType : voucherFilterType;
      const qSearch = search !== undefined ? search : searchQuery;
      
      const params = new URLSearchParams();
      if (fType && fType !== 'ALL') {
        params.append('voucherType', fType);
      }
      if (qSearch && qSearch.trim() !== '') {
        params.append('searchQuery', qSearch.trim());
      }
      
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
      const res = await fetch(`http://localhost:5000/api/vouchers/ledger-statement/${ledgerId}${queryString}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-company-id": activeCompanyId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setLedgerLogs(data);
      } else {
        console.error("Failed to fetch ledger statement");
      }
    } catch (err) {
      console.error("Error fetching ledger statement:", err);
    }
  }

  // Day 13: Debounced effect trigger for filter/search queries
  useEffect(() => {
    if (activeCompanyId && statementLedgerId) {
      const delayDebounceFn = setTimeout(() => {
        fetchLedgerStatement(statementLedgerId, voucherFilterType, searchQuery);
      }, 300);

      return () => clearTimeout(delayDebounceFn);
    } else {
      setLedgerLogs([]);
    }
  }, [statementLedgerId, voucherFilterType, searchQuery, activeCompanyId]);

  // Day 12: Fetch trial balance report
  async function fetchTrialBalance() {
    if (!activeCompanyId) return;
    setTrialBalanceLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:5000/api/reports/trial-balance", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-company-id": activeCompanyId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTrialBalanceData(data);
      } else {
        console.error("Failed to fetch trial balance report");
      }
    } catch (err) {
      console.error("Error fetching trial balance:", err);
    } finally {
      setTrialBalanceLoading(false);
    }
  }

  useEffect(() => {
    if (showTrialBalance && activeCompanyId) {
      fetchTrialBalance();
    }
  }, [showTrialBalance, activeCompanyId]);

  // Day 9: Fetch company ledger groups for ledger creation modal
  async function fetchCompanyLedgerGroups() {
    if (!activeCompanyId) return;
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:5000/api/ledgers/groups", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-company-id": activeCompanyId
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.groups) {
          setLedgerGroups(data.groups);
          if (data.groups.length > 0) {
            setSelectedGroupId(data.groups[0]._id);
          }
        }
      } else {
        console.error("Failed to fetch ledger groups");
      }
    } catch (err) {
      console.error("Error fetching ledger groups:", err);
    }
  }

  useEffect(() => {
    if (showLedgerModal && activeCompanyId) {
      fetchCompanyLedgerGroups();
    }
  }, [showLedgerModal, activeCompanyId]);

  // custom handlers & helper functions defined after all hook calls
  function handleMenuAction(message: string) {
    setActionNotification(message);
    const timeout = setTimeout(() => {
      setActionNotification(null);
    }, 3000);
    return () => clearTimeout(timeout);
  }

  const menuItems = [
    { 
      label: "Accounts Info / Ledgers", 
      displayLabel: () => <span>Accounts Info &gt; <span className="text-red-500 font-extrabold">L</span>edgers</span>, 
      hotkey: "L", 
      section: "MASTERS", 
      action: () => {
        handleMenuAction("Masters: Ledgers Configuration module activated");
        setShowLedgerModal(true);
      }
    },
    { 
      label: "Groups Configuration", 
      displayLabel: () => <span>Accounts Info &gt; <span className="text-red-500 font-extrabold">G</span>roups</span>, 
      hotkey: "G", 
      section: "MASTERS", 
      action: () => handleMenuAction("Masters: Account Groups Configuration module activated") 
    },
    { 
      label: "Accounting Vouchers", 
      displayLabel: () => <span>Accounting <span className="text-red-500 font-extrabold">V</span>ouchers</span>, 
      hotkey: "V", 
      section: "TRANSACTIONS", 
      action: () => handleMenuAction("Transactions: Accounting Vouchers entry activated") 
    },
    { 
      label: "Balance Sheet", 
      displayLabel: () => <span><span className="text-red-500 font-extrabold">B</span>alance Sheet</span>, 
      hotkey: "B", 
      section: "REPORTS", 
      action: () => handleMenuAction("Reports: Balance Sheet report generated") 
    },
    { 
      label: "Profit & Loss A/c", 
      displayLabel: () => <span><span className="text-red-500 font-extrabold">P</span>rofit & Loss A/c</span>, 
      hotkey: "P", 
      section: "REPORTS", 
      action: () => handleMenuAction("Reports: Profit & Loss A/c report generated") 
    },
    { 
      label: "Trial Balance", 
      displayLabel: () => <span><span className="text-red-500 font-extrabold">T</span>ariff / Trial Balance</span>, 
      hotkey: "T", 
      section: "REPORTS", 
      action: () => {
        handleMenuAction("Reports: Trial Balance report generated");
        setShowTrialBalance(true);
      }
    },
    { 
      label: "Switch Company", 
      displayLabel: () => <span><span className="text-red-500 font-extrabold">S</span>witch Company</span>, 
      hotkey: "S", 
      section: "UTILITIES", 
      action: () => handleSwitchCompany() 
    },
    { 
      label: "Quit / Logout", 
      displayLabel: () => <span><span className="text-red-500 font-extrabold">Q</span>uit (Logout)</span>, 
      hotkey: "Q", 
      section: "UTILITIES", 
      action: () => signOut().then(() => window.location.href = "/") 
    }
  ];

  async function fetchCompanies() {
    if (!userId) return;
    setCompaniesLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:5000/api/companies", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCompanies(data.companies);
      } else {
        console.error("Failed to fetch companies:", data.error);
      }
    } catch (err) {
      console.error("Error fetching companies:", err);
    } finally {
      setCompaniesLoading(false);
    }
  }

  async function handleEnterCompany(companyId: string) {
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:5000/api/user/active-company", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ companyId })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCompanyId(data.activeCompanyId);
        if (dbUser) {
          setDbUser({ ...dbUser, activeCompanyId: data.activeCompanyId });
        }
      } else {
        alert(`Error selecting company: ${data.error}`);
      }
    } catch (err) {
      console.error("Error selecting company:", err);
    }
  }

  async function handleSwitchCompany() {
    try {
      const token = await getToken();
      const res = await fetch("http://localhost:5000/api/user/active-company", {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ companyId: null })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveCompanyId(null);
        if (dbUser) {
          setDbUser({ ...dbUser, activeCompanyId: null });
        }
      } else {
        alert(`Error switching company: ${data.error}`);
      }
    } catch (err) {
      console.error("Error clearing company context:", err);
    }
  }

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    try {
      const token = await getToken();
      const res = await fetch("http://localhost:5000/api/companies/create", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          companyName: newCompanyName,
          address: newAddress,
          gstNumber: newGst,
          financialYear: newFy,
          state: newState,
          contactInfo: {
            phone: newPhone,
            email: newEmail
          }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchCompanies();
        if (data.activeCompanyId) {
          setActiveCompanyId(data.activeCompanyId);
          if (dbUser) {
            setDbUser({ ...dbUser, activeCompanyId: data.activeCompanyId });
          }
        }
        setNewCompanyName('');
        setNewAddress('');
        setNewGst('');
        setNewFy('2026-2027');
        setNewState('');
        setNewPhone('');
        setNewEmail('');
        setShowCreateModal(false);
      } else {
        setFormError(data.error || "Failed to create company.");
      }
    } catch (err: any) {
      setFormError(err.message || "Network error. Please try again.");
    } finally {
      setFormSubmitting(false);
    }
  }

  const activeCompany = companies.find(c => c._id === activeCompanyId);

  // Loading States
  if (!isLoaded || syncStatus === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" /> Loading workspace session...
      </div>
    );
  }

  // Error Synchronization States
  if (syncStatus === 'error') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full p-6 rounded-2xl border border-red-900/30 bg-red-950/10 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sync Connection Failure</h2>
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans relative overflow-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-emerald-500/5 blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-teal-500/5 blur-[150px] pointer-events-none"></div>

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
            {activeCompany && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-4">
                <Building2 className="h-3 w-3" /> Active: {activeCompany.companyName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <UserButton />
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 relative z-10">
        
        {/* VIEW 1: ACTIVE COMPANY WORKSPACE VIEW */}
        {activeCompanyId && activeCompany ? (
          <div className="space-y-8 animate-fade-in">
            {/* Split Screen Container */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-zinc-950 p-8 rounded-3xl border border-zinc-900 shadow-2xl relative">
              
              {/* Left Panel: Company Status (5 cols) */}
              <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-zinc-900 pb-8 lg:pb-0 lg:pr-8 flex flex-col justify-between min-h-[350px]">
                <div className="space-y-6">
                  <div className="border-b border-zinc-900 pb-4">
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block mb-1">Current Company Context</span>
                    <h2 className="text-3xl font-black text-zinc-100 tracking-tight leading-tight">{activeCompany.companyName}</h2>
                  </div>

                  <div className="my-3 p-3 bg-zinc-950 border border-zinc-800 rounded flex gap-2 items-center">
                    <span className="text-xs text-zinc-400 uppercase tracking-wider font-mono">Vouchers (Click/Keys):</span>
                    <button type="button" onClick={() => { setVoucherType('CONTRA'); setShowVoucherModal(true); }} className="bg-blue-900/40 hover:bg-blue-800 text-blue-400 border border-blue-800 px-3 py-1 rounded text-xs font-bold">F4: Contra</button>
                    <button type="button" onClick={() => { setVoucherType('PAYMENT'); setShowVoucherModal(true); }} className="bg-amber-900/40 hover:bg-amber-800 text-amber-400 border border-amber-800 px-3 py-1 rounded text-xs font-bold">F5: Payment</button>
                    <button type="button" onClick={() => { setVoucherType('RECEIPT'); setShowVoucherModal(true); }} className="bg-emerald-900/40 hover:bg-emerald-800 text-emerald-400 border border-emerald-800 px-3 py-1 rounded text-xs font-bold">F6: Receipt</button>
                  </div>

                  <div className="grid grid-cols-2 gap-5 text-sm">
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Financial period</span>
                      <span className="text-zinc-300 font-mono block mt-0.5">01-Apr-2026 to 31-Mar-2027</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">State Jurisdiction</span>
                      <span className="text-zinc-300 font-semibold block mt-0.5">{activeCompany.state}</span>
                    </div>
                    {activeCompany.gstNumber && (
                      <div className="col-span-2">
                        <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">GSTIN identifier</span>
                        <span className="text-zinc-300 font-mono block mt-0.5">{activeCompany.gstNumber}</span>
                      </div>
                    )}
                    <div className="col-span-2">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Current system Date</span>
                      <span className="text-emerald-400 font-bold font-mono block mt-0.5">
                        {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Keyboard Quick Navigation Guide */}
                <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-900 text-xs text-zinc-500 space-y-2 mt-6">
                  <p className="font-bold text-zinc-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                    <Zap className="h-3.5 w-3.5 text-emerald-400 animate-pulse" /> Keyboard Navigation Active:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] leading-relaxed">
                    <li>Use <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[9px] shadow-sm">↑</kbd> and <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[9px] shadow-sm">↓</kbd> Arrow Keys to scroll.</li>
                    <li>Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[9px] shadow-sm">Enter</kbd> to select menu items.</li>
                    <li>Press colored hotkey letters (e.g. <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-red-500 font-bold font-mono text-[9px] shadow-sm">L</kbd>) directly.</li>
                    <li>Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[9px] shadow-sm">Esc</kbd> to go back to selection.</li>
                  </ul>
                </div>
              </div>

              {/* Right Panel: Gateway Menu Box (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-center items-center py-4">
                <div className="w-full max-w-md border-2 border-emerald-500/20 bg-zinc-950 rounded-2xl shadow-xl overflow-hidden flex flex-col">
                  {/* Gateway header */}
                  <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-b-2 border-emerald-500/20 px-6 py-4 flex items-center justify-center">
                    <span className="text-xs font-black tracking-widest text-emerald-400 uppercase">Gateway of SmartERP</span>
                  </div>

                  {/* Menu items list */}
                  <div className="p-3 flex flex-col divide-y divide-zinc-900/40">
                    {["MASTERS", "TRANSACTIONS", "REPORTS", "UTILITIES"].map((section) => {
                      const sectionItems = menuItems.filter(item => item.section === section);
                      if (sectionItems.length === 0) return null;

                      return (
                        <div key={section} className="py-2.5 first:pt-0 last:pb-0">
                          <span className="text-[9px] font-extrabold text-zinc-650 block mb-1.5 px-3 tracking-widest uppercase">{section}</span>
                          <div className="space-y-0.5">
                            {sectionItems.map((item) => {
                              const globalIdx = menuItems.findIndex(mi => mi.label === item.label);
                              const isHighlighted = globalIdx === menuIndex;

                              return (
                                <button
                                  key={item.label}
                                  type="button"
                                  onClick={() => {
                                    setMenuIndex(globalIdx);
                                    item.action();
                                  }}
                                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex justify-between items-center transition-all focus:outline-none ${
                                    isHighlighted 
                                      ? "bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30 shadow-lg shadow-emerald-500/5 translate-x-1" 
                                      : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                                  }`}
                                >
                                  {item.displayLabel()}
                                  {isHighlighted && <ArrowRight className="h-4 w-4 text-emerald-400 animate-pulse" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

            </div>

            {/* Day 11: Ledger Statement & Live Audit REPORTS panel */}
            <div id="ledger-statement-print-area" className="bg-zinc-950 p-8 rounded-3xl border border-zinc-900 shadow-2xl relative space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-900 pb-4 gap-4">
                <div>
                  <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block mb-1">REPORTS & STATEMENTS</span>
                  <h3 className="text-xl font-black text-zinc-100 tracking-tight">Ledger Statement & Live Audit</h3>
                </div>
                <div className="flex items-center gap-3 no-print">
                  <label className="text-xs uppercase text-zinc-400 font-bold font-mono">Select Account:</label>
                  <select
                    value={statementLedgerId}
                    onChange={(e) => setStatementLedgerId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-emerald-500 text-white font-semibold shadow-inner"
                  >
                    <option value="">-- Select Ledger --</option>
                    {availableLedgers.map((ledger) => (
                      <option key={ledger._id} value={ledger._id}>
                        {ledger.ledgerName || ledger.name} (Bal: ₹{Number(ledger.currentBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                      </option>
                    ))}
                  </select>
                  {statementLedgerId && ledgerLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/10"
                    >
                      <Printer className="h-3.5 w-3.5" /> Print Statement
                    </button>
                  )}
                </div>
              </div>

              {statementLedgerId && (
                <div className="flex flex-col sm:flex-row gap-4 bg-zinc-900/20 p-4 rounded-2xl border border-zinc-900/65 no-print items-center">
                  <div className="flex-1 w-full relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-zinc-650" />
                    </span>
                    <input
                      type="text"
                      placeholder="Filter transactions by narration keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    <label className="text-[10px] uppercase text-zinc-500 font-extrabold tracking-wider font-mono">Type:</label>
                    <select
                      value={voucherFilterType}
                      onChange={(e) => setVoucherFilterType(e.target.value)}
                      className="w-full sm:w-auto bg-zinc-950 border border-zinc-850 rounded-xl px-4 py-2 text-xs text-zinc-300 font-semibold focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
                    >
                      <option value="ALL">All Vouchers</option>
                      <option value="PAYMENT">Payment</option>
                      <option value="RECEIPT">Receipt</option>
                      <option value="CONTRA">Contra</option>
                    </select>
                  </div>
                </div>
              )}

              {!statementLedgerId ? (
                <div className="text-center py-12 text-zinc-500 text-xs border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20">
                  Select a ledger from the dropdown above to audit statement logs.
                </div>
              ) : ledgerLogs.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/20">
                  No voucher entries found for this ledger.
                </div>
              ) : (
                <div className="overflow-x-auto border border-zinc-900 rounded-2xl bg-zinc-950/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/10 text-zinc-400 font-bold uppercase tracking-wider">
                        <th className="p-4 font-mono">Date</th>
                        <th className="p-4">Type</th>
                        <th className="p-4">Debit/Credit</th>
                        <th className="p-4 text-right">Amount</th>
                        <th className="p-4 text-right">Balance Effect</th>
                        <th className="p-4">Narration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60 font-mono">
                      {ledgerLogs.map((log) => {
                        const isDebit = log.debitLedgerId === statementLedgerId;
                        const effect = isDebit ? `+` : `-`;
                        
                        return (
                          <tr key={log._id} className="hover:bg-zinc-900/25 transition-colors">
                            <td className="p-4 text-zinc-400">
                              {new Date(log.createdAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                                log.voucherType === 'PAYMENT' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                log.voucherType === 'RECEIPT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}>
                                {log.voucherType}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`font-bold ${isDebit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isDebit ? 'Debit (Dr)' : 'Credit (Cr)'}
                              </span>
                            </td>
                            <td className="p-4 text-right text-zinc-200 font-bold">
                              ₹{Number(log.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`p-4 text-right font-bold ${isDebit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {effect}₹{Number(log.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-zinc-300 italic max-w-xs truncate">
                              {log.narration || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          
          /* VIEW 2: COMPANY SELECTION / CREATION VIEW */
          <div className="space-y-10 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Select Business Workspace</h1>
                <p className="text-zinc-500 text-sm mt-1">Choose an existing profile to access accounting books, or create a new profile.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={companies.length >= 5}
                className="px-5 py-3 bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-900 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 transform hover:-translate-y-0.5 disabled:transform-none select-none"
              >
                <Plus className="h-4 w-4" /> Create New Company
              </button>
            </div>

            {/* SaaS limit message banner if at limit */}
            {companies.length >= 5 && (
              <div className="p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 text-emerald-400 text-xs font-semibold flex items-center gap-2.5 max-w-3xl">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>SaaS Limit Reached: You are currently managing the maximum allowable limit of 5 companies. Delete or upgrade to add more.</span>
              </div>
            )}

            {/* Companies Load Spinner */}
            {companiesLoading ? (
              <div className="flex items-center justify-center py-20 text-zinc-500">
                <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mr-2" /> Retrieving company records...
              </div>
            ) : companies.length === 0 ? (
              
              /* EMPTY STATE */
              <div className="border border-dashed border-zinc-800 rounded-3xl p-16 flex flex-col items-center justify-center text-center max-w-3xl mx-auto bg-zinc-950/20">
                <div className="bg-emerald-500/10 p-5 rounded-2xl w-fit mb-6 border border-emerald-500/15">
                  <Building2 className="h-10 w-10 text-emerald-400 stroke-[1.5]" />
                </div>
                <h2 className="text-2xl font-bold mb-3">No Active Business Profiles</h2>
                <p className="text-zinc-500 text-sm max-w-md leading-relaxed mb-8">
                  Get started by establishing your first company context. Enter tax records and location configurations to sync accounting profiles.
                </p>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3.5 bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 transform hover:-translate-y-0.5 shadow-lg shadow-emerald-500/15"
                >
                  Create Your First Company <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              
              /* COMPANIES LIST GRID */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map((company) => (
                  <div 
                    key={company._id} 
                    className="p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 hover:border-zinc-800 transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-4">
                        <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800 text-zinc-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 transition-colors">
                          <Building2 className="h-5 w-5 stroke-[2]" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-500 px-2 py-0.5 border border-zinc-800 rounded-full bg-zinc-950">
                          FY {company.financialYear}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-zinc-100 line-clamp-1 mb-1">{company.companyName}</h3>
                      <p className="text-zinc-500 text-xs flex items-center gap-1 mb-4"><MapPin className="h-3 w-3" /> {company.state}</p>
                      
                      {company.gstNumber && (
                        <div className="space-y-1 text-xs border-t border-zinc-900/60 pt-3 mt-3">
                          <span className="text-zinc-500 block">GSTIN</span>
                          <span className="font-mono text-zinc-300">{company.gstNumber}</span>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => handleEnterCompany(company._id)}
                      className="w-full mt-6 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 hover:text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      Enter Workspace 
                      <ArrowRight className="h-4 w-4 text-emerald-400 group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* CREATE NEW COMPANY MODAL OVERLAY */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-900 rounded-3xl p-8 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-emerald-400" /> Setup Business Workspace
                </h2>
                <p className="text-zinc-500 text-xs mt-1">Configure company localized settings for accounting isolation.</p>
              </div>
            </div>

            {/* Form Error Banner */}
            {formError && (
              <div className="p-4 rounded-xl border border-red-900/30 bg-red-950/10 text-red-400 text-xs flex items-start gap-2 mb-6 animate-fade-in">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Creation Error</p>
                  <p className="text-red-500/80 mt-0.5">{formError}</p>
                </div>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleCreateCompany} className="space-y-5">
              
              {/* Row 1: Company Name */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">COMPANY NAME *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Acme Corporation Pvt. Ltd."
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Row 2: FY & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">FINANCIAL YEAR *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. 2026-2027"
                    value={newFy}
                    onChange={(e) => setNewFy(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-650 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">STATE (JURISDICTION) *</label>
                  <StateCombobox value={newState} onChange={setNewState} />
                </div>
              </div>

              {/* Row 3: GSTIN */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">GSTIN NUMBER (OPTIONAL)</label>
                <input 
                  type="text" 
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={newGst}
                  onChange={(e) => setNewGst(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors font-mono"
                />
              </div>

              {/* Row 4: Address */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">BUSINESS ADDRESS (OPTIONAL)</label>
                <textarea 
                  rows={2}
                  placeholder="Street details, building, city..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Row 5: Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">CONTACT PHONE</label>
                  <input 
                    type="text" 
                    placeholder="e.g. +91 9876543210"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-semibold">CONTACT EMAIL</label>
                  <input 
                    type="email" 
                    placeholder="e.g. accounts@acme.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500/50 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* CTAs */}
              <div className="flex gap-4 justify-end border-t border-zinc-900/60 pt-6 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-3 bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-900 text-zinc-950 font-bold rounded-xl text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"
                >
                  {formSubmitting && <RefreshCw className="h-4 w-4 animate-spin mr-1" />} Sync & Save Profile
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Floating Action Notification */}
      {actionNotification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl border border-emerald-500/20 bg-zinc-950 shadow-2xl animate-fade-in flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs font-semibold text-emerald-400">{actionNotification}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-8 text-center text-zinc-650 text-xs mt-auto">
        <p>© 2026 SmartERP. Day 4 Complete: Gateway of SmartERP Main Layout.</p>
      </footer>

      {showStockModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); alert("Stock Item Created locally!"); setShowStockModal(false); }} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg max-w-md w-full shadow-2xl space-y-4 text-white">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-lg font-bold text-emerald-400">⚡ Create Stock Item (Day 6)</h3>
              <button type="button" onClick={() => setShowStockModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">Item Name *</label>
              <input required autoFocus className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 text-sm text-zinc-100" placeholder="e.g., Logitech Mouse" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">SKU Code</label>
                <input className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 text-sm text-zinc-100" placeholder="ELEC-001" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">GST % *</label>
                <select className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 text-sm text-white">
                  <option value="18">18% Standard</option>
                  <option value="12">12%</option>
                  <option value="5">5%</option>
                  <option value="28">28%</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">Purchase Price</label>
                <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 text-sm text-zinc-100" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1">Opening Qty</label>
                <input type="number" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 focus:outline-none focus:border-emerald-500 text-sm text-zinc-100" placeholder="0" />
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-black font-bold py-2 rounded text-sm transition-colors mt-4">
              Save Item (Press ENTER)
            </button>
          </form>
        </div>
      )}

      {showVoucherModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const debitLedgerId = formData.get('debitLedgerId');
            const creditLedgerId = formData.get('creditLedgerId');
            const amount = formData.get('amount');
            const narration = formData.get('narration');
            
            try {
              const token = await getToken();
              const res = await fetch("http://localhost:5000/api/vouchers/create", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json",
                  "x-company-id": activeCompanyId || ""
                },
                body: JSON.stringify({
                  voucherType,
                  debitLedgerId,
                  creditLedgerId,
                  amount: Number(amount),
                  narration
                })
              });
              
              const data = await res.json();
              if (res.status === 201) {
                alert(`Voucher ${voucherType} created successfully!`);
                setVoucherError('');
                setShowVoucherModal(false);
                fetchCompanyLedgers(); // Day 9: Re-fetch sequence
                if (statementLedgerId) {
                  fetchLedgerStatement(statementLedgerId);
                }
                if (showTrialBalance) {
                  fetchTrialBalance();
                }
              } else {
                setVoucherError(data.error || 'Unknown error');
              }
            } catch (err) {
              console.error("Voucher creation client error:", err);
              setVoucherError("Network error creating voucher.");
            }
          }} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg max-w-md w-full text-white space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className={`text-md font-bold uppercase tracking-wide ${
                voucherType === 'CONTRA' ? 'text-blue-400' :
                voucherType === 'PAYMENT' ? 'text-amber-400' :
                voucherType === 'RECEIPT' ? 'text-emerald-400' : 'text-amber-400'
              }`}>⚡ {voucherType} VOUCHER (Day 10)</h3>
              <button type="button" onClick={() => setShowVoucherModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            {voucherError && <div className="p-2.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-900 rounded font-mono">{voucherError}</div>}
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Particulars (Debit Account)</label>
              <select
                name="debitLedgerId"
                required
                value={debitLedgerId}
                onChange={(e) => setDebitLedgerId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 text-white"
              >
                {availableLedgers.length === 0 ? (
                  <option value="">No Ledgers Available</option>
                ) : (
                  availableLedgers.map((ledger) => (
                    <option key={ledger._id} value={ledger._id}>
                      {ledger.ledgerName || ledger.name} (Bal: {ledger.currentBalance})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Particulars (Credit Account)</label>
              <select
                name="creditLedgerId"
                required
                value={creditLedgerId}
                onChange={(e) => setCreditLedgerId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 text-white"
              >
                {availableLedgers.length === 0 ? (
                  <option value="">No Ledgers Available</option>
                ) : (
                  availableLedgers.map((ledger) => (
                    <option key={ledger._id} value={ledger._id}>
                      {ledger.ledgerName || ledger.name} (Bal: {ledger.currentBalance})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Amount (INR)</label>
              <input name="amount" type="number" required placeholder="0.00" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Narration</label>
              <textarea name="narration" placeholder="Being payment made for..." className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-amber-500 h-16 resize-none" />
            </div>
            <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold py-2 rounded text-sm transition-colors">
              Accept Voucher (ENTER)
            </button>
          </form>
        </div>
      )}


      {showLedgerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <form onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const ledgerName = formData.get('ledgerName');
            const openingBalance = formData.get('openingBalance');
            
            try {
              const token = await getToken();
              const res = await fetch("http://localhost:5000/api/ledgers/create", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${token}`,
                  "Content-Type": "application/json",
                  "x-company-id": activeCompanyId || ""
                },
                body: JSON.stringify({
                  ledgerName,
                  groupId: selectedGroupId,
                  companyId: activeCompanyId,
                  openingBalance: Number(openingBalance) || 0
                })
              });
              
              const data = await res.json();
              if (res.ok) {
                alert("Ledger Created Successfully!");
                setShowLedgerModal(false);
                fetchCompanyLedgers(); // Day 9: Refresh available ledgers in dropdowns
              } else {
                alert(`Error creating ledger: ${data.error || 'Unknown error'}`);
              }
            } catch (err) {
              console.error("Ledger creation client error:", err);
              alert("Network error creating ledger.");
            }
          }} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg max-w-md w-full text-white space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <h3 className="text-md font-bold text-emerald-400">🆕 CREATE LEDGER MASTER</h3>
              <button type="button" onClick={() => setShowLedgerModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Ledger Name</label>
              <input name="ledgerName" required placeholder="e.g., Cash A/c or Rent Expense" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100" />
            </div>
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Under Group</label>
              <select
                name="groupId"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-white"
              >
                {ledgerGroups.length === 0 ? (
                  <option value="">No Groups Available</option>
                ) : (
                  ledgerGroups.map((g) => (
                    <option key={g._id} value={g._id}>{g.groupName}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1">Opening Balance (INR)</label>
              <input name="openingBalance" type="number" defaultValue="0" className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-500 text-zinc-100" />
            </div>
            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-2 rounded text-sm transition-colors">
              Save Ledger (ENTER)
            </button>
          </form>
        </div>
      )}

      {/* Day 12: Trial Balance Modal Overlay */}
      {showTrialBalance && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-4xl w-full text-white space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-widest block mb-1">Financial Report</span>
                <h3 className="text-xl font-black text-zinc-100 tracking-tight flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-400" /> Trial Balance Statement
                </h3>
              </div>
              <button type="button" onClick={() => setShowTrialBalance(false)} className="text-zinc-500 hover:text-white text-lg">✕</button>
            </div>

            {trialBalanceLoading ? (
              <div className="flex justify-center items-center py-20 text-zinc-400 text-xs">
                <RefreshCw className="h-5 w-5 animate-spin text-emerald-400 mr-2" /> Loading aggregated ledgers...
              </div>
            ) : !trialBalanceData ? (
              <div className="text-center py-20 text-zinc-500 text-xs">
                No trial balance data available.
              </div>
            ) : (
              <div className="space-y-6">
                {/* 2-Column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Debit Balances */}
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-emerald-400 font-bold border-b border-zinc-800 pb-1.5 flex justify-between">
                      <span>Debit Accounts (Assets/Expenses)</span>
                      <span>Debit (Dr)</span>
                    </h4>
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                      {trialBalanceData.assets.length === 0 ? (
                        <p className="text-xs text-zinc-650 italic">No debit balance ledgers found.</p>
                      ) : (
                        trialBalanceData.assets.map((item: any) => (
                          <div key={item._id} className="flex justify-between items-center text-xs bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900/50 hover:border-zinc-800/60 transition-colors font-mono">
                            <div>
                              <span className="text-zinc-200 font-bold block">{item.ledgerName}</span>
                              <p className="text-xs text-zinc-500 uppercase">{item.groupName || item.category || 'Account'}</p>
                            </div>
                            <span className="text-zinc-300 font-bold">
                              ₹{Number(item.currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right Column: Credit Balances */}
                  <div className="space-y-3">
                    <h4 className="text-xs uppercase tracking-wider text-blue-400 font-bold border-b border-zinc-800 pb-1.5 flex justify-between">
                      <span>Credit Accounts (Liabilities/Equity/Income)</span>
                      <span>Credit (Cr)</span>
                    </h4>
                    <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
                      {trialBalanceData.liabilities.length === 0 ? (
                        <p className="text-xs text-zinc-650 italic">No credit balance ledgers found.</p>
                      ) : (
                        trialBalanceData.liabilities.map((item: any) => (
                          <div key={item._id} className="flex justify-between items-center text-xs bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-900/50 hover:border-zinc-800/60 transition-colors font-mono">
                            <div>
                              <span className="text-zinc-200 font-bold block">{item.ledgerName}</span>
                              <p className="text-xs text-zinc-500 uppercase">{item.groupName || item.category || 'Account'}</p>
                            </div>
                            <span className="text-zinc-300 font-bold">
                              ₹{Number(item.currentBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Summary Bar */}
                <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4 font-mono text-sm bg-zinc-900/30 p-4 rounded-2xl border border-zinc-850">
                  <div className="flex justify-between items-center font-black">
                    <span className="text-zinc-400 uppercase text-xs">Total Debit:</span>
                    <span className="text-emerald-400">
                      ₹{Number(trialBalanceData.totalDebit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-black">
                    <span className="text-zinc-400 uppercase text-xs">Total Credit:</span>
                    <span className="text-blue-400">
                      ₹{Number(trialBalanceData.totalCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  
                  {/* Balancing Status Badge */}
                  {(() => {
                    const difference = Math.abs(trialBalanceData.totalDebit - trialBalanceData.totalCredit);
                    return (
                      <div className="col-span-2 border-t border-zinc-900/50 pt-3 flex justify-between items-center text-xs">
                        <span className="text-zinc-500 uppercase font-mono tracking-wider">Statement Reconciliation:</span>
                        {difference < 0.01 ? (
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            ✓ Balanced
                          </span>
                        ) : (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                            ⚠ Out of Balance (Diff: ₹{difference.toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                          </span>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global CSS block for Print overrides */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden;
          }
          #ledger-statement-print-area, #ledger-statement-print-area * {
            visibility: visible;
          }
          #ledger-statement-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #ledger-statement-print-area table {
            border: 1px solid #000 !important;
            width: 100% !important;
          }
          #ledger-statement-print-area th {
            color: black !important;
            background: #f0f0f0 !important;
            border-bottom: 2px solid #000 !important;
            padding: 8px !important;
          }
          #ledger-statement-print-area td {
            color: black !important;
            border-bottom: 1px solid #ccc !important;
            padding: 8px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
