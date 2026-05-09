import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import {
  MessageSquare, Plus, Clock, CheckCircle, AlertCircle, CreditCard,
  Activity, LogOut, RefreshCw, ExternalLink, Zap,
  Shield, Star, X, Loader, FileText, Key, Eye, EyeOff,
  Github, Globe, Database, Bot, ChevronDown, ChevronUp,
  Copy, ArrowRight, Sparkles, Trash2,
} from "lucide-react";

interface Project {
  id: string;
  tier: string;
  status: string;
  upfront_amount: number;
  balance_amount: number;
  description?: string;
  github_repo?: string;
  site_url?: string;
  created_at: string;
  delivered_at?: string;
}

interface UserDashboardData {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    subscription_status: string | null;
    subscription_tier: string | null;
    stripe_subscription_id: string | null;
  };
  projects: Project[];
}

interface SavedCredential {
  provider: string;
  saved: boolean;
  updated_at: string;
}

// ── Sample prompts the user can click to pre-fill chat ──
const SAMPLE_PROMPTS = [
  {
    category: "Fix Errors",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    icon: AlertCircle,
    prompts: [
      {
        title: "TypeScript build error",
        text: "My TypeScript project won't build. Here are the errors:\n\n[PASTE YOUR ERRORS HERE]\n\nHere is the file causing issues:\n\n[PASTE YOUR CODE HERE]\n\nPlease identify the root cause and give me the complete fixed file.",
      },
      {
        title: "npm install / dependency conflict",
        text: "I'm getting dependency errors when running npm install:\n\n[PASTE ERROR HERE]\n\nMy package.json is:\n\n[PASTE package.json HERE]\n\nPlease fix the dependency conflicts and give me an updated package.json.",
      },
      {
        title: "Runtime / console error",
        text: "My app crashes at runtime with this error:\n\n[PASTE ERROR + STACK TRACE HERE]\n\nThis happens when I [DESCRIBE WHAT YOU DO]. Here's the relevant code:\n\n[PASTE CODE HERE]\n\nPlease find the bug and fix it completely.",
      },
    ],
  },
  {
    category: "Deploy to Vercel",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: Globe,
    prompts: [
      {
        title: "Deploy my project to Vercel",
        text: "Please deploy my project to Vercel. My GitHub repo is:\n\n[PASTE REPO URL HERE]\n\nEnvironment variables I need set:\n\n[LIST YOUR ENV VARS]\n\nPlease set everything up and give me the live URL.",
      },
      {
        title: "Fix a failing Vercel build",
        text: "My Vercel deployment is failing. Here is the build log:\n\n[PASTE VERCEL BUILD LOG HERE]\n\nMy project uses [FRAMEWORK e.g. Next.js / Vite / React]. Please diagnose and fix the build so it deploys successfully.",
      },
      {
        title: "Set up environment variables",
        text: "I need to add environment variables to my Vercel project. My project name/URL is:\n\n[PROJECT NAME OR VERCEL URL]\n\nPlease add these environment variables for production:\n\n[LIST KEY=VALUE PAIRS]",
      },
    ],
  },
  {
    category: "GitHub & Code",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    icon: Github,
    prompts: [
      {
        title: "Review & fix my repo",
        text: "Please look at my GitHub repository and fix all the issues:\n\nRepo: [PASTE REPO URL]\n\nMain problems:\n1. [DESCRIBE PROBLEM 1]\n2. [DESCRIBE PROBLEM 2]\n\nPlease read the code, identify all issues, and push the fixes.",
      },
      {
        title: "Add a feature to my project",
        text: "I need you to add a new feature to my existing project:\n\nRepo: [PASTE REPO URL]\n\nFeature needed:\n[DESCRIBE THE FEATURE IN DETAIL]\n\nPlease implement it completely and push the changes.",
      },
      {
        title: "Code review & refactor",
        text: "Please review this code and refactor it for production quality:\n\n[PASTE CODE HERE]\n\nFocus on: error handling, TypeScript types, performance, and security. Give me the complete refactored version.",
      },
    ],
  },
  {
    category: "Supabase & Database",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    icon: Database,
    prompts: [
      {
        title: "Fix Supabase auth issue",
        text: "My Supabase authentication isn't working correctly. The error is:\n\n[PASTE ERROR HERE]\n\nHere is my auth code:\n\n[PASTE CODE HERE]\n\nMy Supabase project URL is: [YOUR SUPABASE URL]\n\nPlease fix the auth implementation completely.",
      },
      {
        title: "Fix RLS / permissions",
        text: "I'm getting Row Level Security errors in Supabase. The error is:\n\n[PASTE ERROR]\n\nThe query that's failing:\n\n[PASTE QUERY]\n\nPlease write the correct RLS policies and explain what was wrong.",
      },
      {
        title: "Design & create a table",
        text: "I need a new Supabase table for my app. Here's what it needs to store:\n\n[DESCRIBE THE DATA]\n\nRelationships with existing tables:\n[DESCRIBE RELATIONSHIPS]\n\nPlease write the complete SQL schema with indexes, RLS policies, and any triggers needed.",
      },
    ],
  },
];

// ── API credential definitions ──
const CREDENTIAL_DEFS = [
  {
    provider: "github",
    label: "GitHub Personal Access Token",
    icon: Github,
    color: "text-white",
    placeholder: "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    hint: "Needs: repo, workflow scopes",
    helpUrl: "https://github.com/settings/tokens/new",
    helpLabel: "Create on GitHub →",
  },
  {
    provider: "vercel",
    label: "Vercel API Token",
    icon: Globe,
    color: "text-white",
    placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxx",
    hint: "From: Vercel → Settings → Tokens",
    helpUrl: "https://vercel.com/account/tokens",
    helpLabel: "Create on Vercel →",
  },
  {
    provider: "supabase_url",
    label: "Supabase Project URL",
    icon: Database,
    color: "text-emerald-400",
    placeholder: "https://xxxxxxxxxxxxxxxxxxxx.supabase.co",
    hint: "From: Supabase → Settings → API",
    helpUrl: "https://supabase.com/dashboard",
    helpLabel: "Find in Supabase →",
  },
  {
    provider: "supabase_key",
    label: "Supabase Service Role Key",
    icon: Database,
    color: "text-emerald-400",
    placeholder: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    hint: "Service role key (not anon key)",
    helpUrl: "https://supabase.com/dashboard",
    helpLabel: "Find in Supabase →",
  },
  {
    provider: "anthropic",
    label: "Anthropic API Key",
    icon: Bot,
    color: "text-orange-400",
    placeholder: "sk-ant-api03-...",
    hint: "Optional — uses shared key if not set",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpLabel: "Create on Anthropic →",
  },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  pending:          { label: "Awaiting Start",           color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",  icon: Clock,       desc: "Your project is queued. We'll start work shortly." },
  in_progress:      { label: "In Progress",              color: "text-blue-400 bg-blue-500/15 border-blue-500/30",        icon: Activity,    desc: "Our agent is actively working on your project." },
  awaiting_payment: { label: "Awaiting Balance Payment", color: "text-purple-400 bg-purple-500/15 border-purple-500/30", icon: CreditCard,  desc: "Your project has been delivered! Pay the balance to access everything." },
  delivered:        { label: "Delivered ✓",              color: "text-green-400 bg-green-500/15 border-green-500/30",    icon: CheckCircle, desc: "Your project is live and fully delivered." },
  failed:           { label: "Needs Attention",          color: "text-red-400 bg-red-500/15 border-red-500/30",          icon: AlertCircle, desc: "There was an issue. Contact support for a refund or retry." },
};

const TIER_LABELS: Record<string, string> = {
  SITE: "SITE Rescue",
  CODE: "CODE Rescue",
  BUNDLE: "Bundle Rescue",
};

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundProject, setRefundProject] = useState<Project | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Credentials state
  const [savedCreds, setSavedCreds] = useState<Record<string, SavedCredential>>({});
  const [credValues, setCredValues] = useState<Record<string, string>>({});
  const [credVisible, setCredVisible] = useState<Record<string, boolean>>({});
  const [credSaving, setCredSaving] = useState<Record<string, boolean>>({});
  const [credDeleting, setCredDeleting] = useState<Record<string, boolean>>({});
  const [showCreds, setShowCreds] = useState(false);

  // Prompts state
  const [showPrompts, setShowPrompts] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);

  };

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/user/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { logout(); navigate("/login"); return; }
      const d = await res.json();
      setData(d);
    } catch {
      showToast("Failed to load dashboard", "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Show success toast when redirected back from Stripe subscription checkout
  useEffect(() => {
    if (searchParams.get("subscribed") === "true") {
      showToast("🎉 Subscription activated! Welcome to monthly maintenance.");
      setSearchParams({}, { replace: true });
    }
  }, []);

  // Load saved credentials (names only — no token values returned)
  // Auto-expand the credentials section if no credentials are saved yet
  useEffect(() => {
    if (!token) return;
    fetch("/api/user/credentials", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(({ credentials }) => {
        if (Array.isArray(credentials)) {
          const map: Record<string, SavedCredential> = {};
          credentials.forEach((c: SavedCredential) => { map[c.provider] = c; });
          setSavedCreds(map);
          // Auto-expand credentials panel on first login if none are saved yet
          if (credentials.length === 0) {
            setShowCreds(true);
          }
        }
      })
      .catch(() => {});
  }, [token]);

  const handleSaveCredential = async (provider: string) => {
    const value = credValues[provider]?.trim();
    if (!value) return;
    setCredSaving((s) => ({ ...s, [provider]: true }));
    try {
      const res = await fetch("/api/user/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, access_token: value }),
      });
      const d = await res.json();
      if (d.success) {
        setSavedCreds((s) => ({ ...s, [provider]: { provider, saved: true, updated_at: new Date().toISOString() } }));
        setCredValues((s) => ({ ...s, [provider]: "" }));
        showToast(`✅ ${provider} token saved securely`);
      } else {
        showToast(d.error || "Failed to save", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setCredSaving((s) => ({ ...s, [provider]: false }));
    }
  };

  const handleDeleteCredential = async (provider: string) => {
    setCredDeleting((s) => ({ ...s, [provider]: true }));
    try {
      await fetch(`/api/user/credentials/${provider}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSavedCreds((s) => { const n = { ...s }; delete n[provider]; return n; });
      showToast(`${provider} token removed`);
    } catch {
      showToast("Failed to remove", "error");
    } finally {
      setCredDeleting((s) => ({ ...s, [provider]: false }));
    }
  };

  const handlePromptClick = (promptText: string, action: "chat" | "copy") => {
    if (action === "copy") {
      navigator.clipboard?.writeText(promptText).catch(() => {});
      setCopiedPrompt(promptText);
      setTimeout(() => setCopiedPrompt(null), 2000);
    } else {
      sessionStorage.setItem("chat_prefill", promptText);
      navigate("/chat");
    }
  };

  const handleSubscribe = async (priceId: string) => {
    setSubscribing(true);
    try {
      const res = await fetch("/api/stripe/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ priceId }),
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else showToast(d.error || "Failed to start subscription", "error");
    } catch {
      showToast("Network error", "error");
    } finally {
      setSubscribing(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.url) window.location.href = d.url;
      else showToast(d.error || "Failed to open billing portal", "error");
    } catch {
      showToast("Network error", "error");
    }
  };

  const handleRefundSubmit = async () => {
    if (!refundProject || !refundReason.trim()) return;
    setRefundSubmitting(true);
    try {
      const res = await fetch("/api/user/refund-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ projectId: refundProject.id, reason: refundReason }),
      });
      const d = await res.json();
      if (d.success) {
        showToast("Refund request submitted. We'll respond within 24h.");
        setShowRefundModal(false);
        setRefundReason("");
      } else {
        showToast(d.error || "Failed to submit", "error");
      }
    } catch {
      showToast("Network error", "error");
    } finally {
      setRefundSubmitting(false);
    }
  };

  const hasActiveSubscription = data?.user?.subscription_status === "active";
  const activeProjects = data?.projects?.filter((p) => p.status !== "delivered") || [];
  const deliveredProjects = data?.projects?.filter((p) => p.status === "delivered") || [];

  // Paid users have a role of SITE, CODE, or BUNDLE — they have full portal access
  // regardless of whether they have active projects yet.
  const isPaidUser = ["SITE", "CODE", "BUNDLE"].includes(data?.user?.role || "");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${
          toast.type === "success"
            ? "bg-green-500/20 border border-green-500/40 text-green-300"
            : "bg-red-500/20 border border-red-500/40 text-red-300"
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0a1a]/95 backdrop-blur-sm border-b border-white/10 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Code Expert Agent" className="h-9 w-9 object-contain" />
            <span className="font-bold text-lg hidden sm:block">Code Expert Agent</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={fetchDashboard}
              className="p-2 text-gray-400 hover:text-white transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="text-gray-400 text-sm hidden sm:block">
              {data?.user?.name || user?.email}
            </span>
            <button
              onClick={() => { logout(); navigate("/"); }}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:block">Sign out</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                Welcome back, {data?.user?.name?.split(" ")[0] || "there"} 👋
              </h1>
              <p className="text-gray-400 text-sm">
                {data?.projects?.length
                  ? `You have ${data.projects.length} project${data.projects.length > 1 ? "s" : ""} — ${activeProjects.length} active.`
                  : isPaidUser
                  ? "Your plan is active — open the agent to get started."
                  : "No projects yet. Start your first rescue below."}
              </p>
            </div>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Project
            </Link>
          </div>
        </div>

        {/* ── CREDENTIAL SETUP PROMPT (shown on first login / missing creds) ── */}
        {Object.keys(savedCreds).length === 0 && (
          <div className={`rounded-2xl p-6 border ${isPaidUser
            ? "bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/40"
            : "bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-cyan-500/30"
          }`}>
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPaidUser ? "bg-yellow-500/20" : "bg-cyan-500/20"}`}>
                <Key className={`w-5 h-5 ${isPaidUser ? "text-yellow-400" : "text-cyan-400"}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-white mb-1 flex items-center gap-2">
                  {isPaidUser ? "⚡ Connect your accounts to get started" : "🔐 Set up your API credentials"}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-normal ${isPaidUser
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-cyan-500/20 text-cyan-400"
                  }`}>
                    {isPaidUser ? "Required" : "Recommended"}
                  </span>
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-1">
                  The agent needs your API tokens to work on <strong className="text-white">your</strong> GitHub repos,
                  deploy to <strong className="text-white">your</strong> Vercel account, and access <strong className="text-white">your</strong> Supabase project.
                </p>
                <p className="text-gray-500 text-xs mb-4">
                  Every token is <strong className="text-white">AES-256 encrypted</strong> before being stored — isolated to your account,
                  never shared, never logged. The agent decrypts them only at the moment it acts on your behalf.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => { setShowCreds(true); setTimeout(() => document.getElementById("creds-section")?.scrollIntoView({ behavior: "smooth" }), 100); }}
                    className={`inline-flex items-center gap-2 font-bold px-4 py-2.5 rounded-xl transition text-sm ${isPaidUser
                      ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                      : "bg-cyan-500 hover:bg-cyan-400 text-black"
                    }`}
                  >
                    <Key className="w-4 h-4" />
                    {isPaidUser ? "Add My Tokens Now" : "Add My Credentials"}
                  </button>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Github className="w-3.5 h-3.5" /> GitHub</span>
                    <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5" /> Vercel</span>
                    <span className="flex items-center gap-1"><Database className="w-3.5 h-3.5" /> Supabase</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Important notice about how this works */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white mb-1">How your plan works</p>
              <p className="text-gray-400 text-sm leading-relaxed">
                Your one-time fee covers <strong className="text-white">one project / one repository</strong> — we fix it, deploy it, and our job is done.
                Each additional project requires a new fee. Want us to keep improving your deployed app?{" "}
                <strong className="text-white">Opt into the Monthly Maintenance plan</strong> below and we'll continue developing and maintaining it for you.
              </p>
            </div>
          </div>
        </div>

        {/* Active Projects */}
        {activeProjects.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-400" />
              Active Projects
            </h2>
            <div className="space-y-4">
              {activeProjects.map((project) => {
                const statusCfg = STATUS_CONFIG[project.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusCfg.icon;
                return (
                  <div key={project.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span className="bg-blue-500/20 text-blue-400 text-xs font-bold px-3 py-1 rounded-full">
                            {TIER_LABELS[project.tier] || project.tier}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${statusCfg.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-1">{statusCfg.desc}</p>
                        {project.description && (
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{project.description}</p>
                        )}
                        {project.github_repo && (
                          <a
                            href={project.github_repo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs mt-2"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View Repository
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:items-end">
                        {/* Chat button — only for in_progress or pending */}
                        {(project.status === "in_progress" || project.status === "pending") && (
                          <Link
                            to="/chat"
                            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-black font-bold px-4 py-2.5 rounded-xl transition text-sm"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Open Chat
                          </Link>
                        )}
                        {/* Balance payment button */}
                        {project.status === "awaiting_payment" && (
                          <a
                            href={`/pay-balance?order_id=${project.id}&tier=${project.tier}&email=${encodeURIComponent(data?.user?.email || "")}`}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-400 text-black font-bold px-4 py-2.5 rounded-xl transition hover:opacity-90 text-sm"
                          >
                            <CreditCard className="w-4 h-4" />
                            Pay ${(project.balance_amount / 100).toFixed(0)} Balance
                          </a>
                        )}
                        {/* Refund request */}
                        {(project.status === "pending" || project.status === "failed") && (
                          <button
                            onClick={() => { setRefundProject(project); setShowRefundModal(true); }}
                            className="text-xs text-gray-500 hover:text-red-400 transition"
                          >
                            Request refund
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Delivered Projects */}
        {deliveredProjects.length > 0 && (
          <section>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              Delivered Projects
            </h2>
            <div className="space-y-3">
              {deliveredProjects.map((project) => (
                <div key={project.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">
                        {TIER_LABELS[project.tier] || project.tier}
                      </span>
                      <span className="text-green-400 text-xs font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Delivered
                      </span>
                    </div>
                    {project.site_url && (
                      <a href={project.site_url} target="_blank" rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Live Site
                      </a>
                    )}
                    {project.description && (
                      <p className="text-gray-500 text-xs mt-1 line-clamp-1">{project.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link to="/chat" className="inline-flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition">
                      <MessageSquare className="w-3.5 h-3.5" /> Continue Chat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* No projects yet — show different UX depending on whether user has paid */}
        {!data?.projects?.length && (
          isPaidUser ? (
            /* ── PAID USER: full access banner → send them straight to the agent ── */
            <section>
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-8 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">
                  You're all set, {data?.user?.name?.split(" ")[0] || "there"} 🎉
                </h3>
                <p className="text-gray-400 mb-2 max-w-lg mx-auto">
                  Your <span className="text-green-300 font-semibold">{TIER_LABELS[data?.user?.role || ""] || data?.user?.role}</span> plan is active.
                  The agent is ready to fix your code, deploy your project, and manage your repos right now.
                </p>
                <p className="text-gray-500 text-sm mb-8 max-w-md mx-auto">
                  Paste a GitHub link, share an error, or describe what's broken — the agent handles the rest.
                </p>
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-8 py-4 rounded-xl hover:opacity-90 transition text-base"
                >
                  <MessageSquare className="w-5 h-5" />
                  Open Agent Chat
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
                  <span className="flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /> GitHub access</span>
                  <span className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Vercel deploy</span>
                  <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5" /> Supabase access</span>
                </div>
              </div>
            </section>
          ) : (
            /* ── FREE / UNPAID USER: show the conversion / paywall screen ── */
            <section className="text-center py-16">
              <div className="w-16 h-16 bg-blue-500/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">No projects yet</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Start your first code rescue. Pick a plan, describe what's broken, and our agent gets to work.
              </p>
              <Link to="/signup" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-6 py-3 rounded-xl hover:opacity-90 transition">
                <Plus className="w-4 h-4" /> Start First Rescue
              </Link>
            </section>
          )
        )}

        {/* Monthly Maintenance */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Monthly Maintenance
            </h2>
          </div>

          {hasActiveSubscription ? (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="font-bold text-green-300">
                      {data?.user?.subscription_tier === "monthly_priority" ? "Priority Maintenance" : "Maintenance"} — Active
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Your project is being actively maintained and improved. We're on it.
                  </p>
                </div>
                <button
                  onClick={handleManageSubscription}
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition text-sm font-medium"
                >
                  <CreditCard className="w-4 h-4" />
                  Manage Plan
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* $49/mo */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-1">Maintenance</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">$49</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">Ongoing AI assistance for one deployed project.</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1 text-sm text-gray-300">
                  {["Continuous bug fixes & improvements","Feature additions on request","Performance optimizations","One project covered","Cancel anytime"].map((f) => (
                    <li key={f} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe("price_1TROyNGusAHZYXWWOumjFrV7")}
                  disabled={subscribing || !data?.projects?.length}
                  className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-3 rounded-xl transition disabled:opacity-40 text-sm"
                >
                  {subscribing ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : "Subscribe — $49/mo"}
                </button>
                {!data?.projects?.length && (
                  <p className="text-xs text-gray-500 text-center mt-2">Requires an active project</p>
                )}
              </div>

              {/* $99/mo */}
              <div className="bg-gradient-to-b from-blue-500/15 to-white/5 border-2 border-blue-500/40 rounded-2xl p-6 flex flex-col relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                  BEST VALUE
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-1">Priority Maintenance</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">$99</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">Priority support + up to 3 projects covered.</p>
                </div>
                <ul className="space-y-2 mb-6 flex-1 text-sm text-gray-300">
                  {["Everything in Maintenance","Up to 3 projects covered","Priority response time","Proactive monitoring","Cancel anytime"].map((f) => (
                    <li key={f} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />{f}</li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe("price_1TROyNGusAHZYXWWQsSE8sGn")}
                  disabled={subscribing || !data?.projects?.length}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold py-3 rounded-xl hover:opacity-90 transition disabled:opacity-40 text-sm"
                >
                  {subscribing ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : "Subscribe — $99/mo"}
                </button>
                {!data?.projects?.length && (
                  <p className="text-xs text-gray-500 text-center mt-2">Requires an active project</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ── SAMPLE PROMPTS ── */}
        <section>
          <button
            onClick={() => setShowPrompts((v) => !v)}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Sample Prompts
              <span className="text-xs font-normal text-gray-500 ml-1">— click to send straight to chat</span>
            </h2>
            {showPrompts
              ? <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-white transition" />
              : <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition" />}
          </button>

          {showPrompts && (
            <div className="space-y-5">
              {SAMPLE_PROMPTS.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <div key={cat.category}>
                    <div className="flex items-center gap-2 mb-3">
                      <CatIcon className={`w-4 h-4 ${cat.color}`} />
                      <span className={`text-sm font-semibold ${cat.color}`}>{cat.category}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {cat.prompts.map((prompt) => (
                        <div
                          key={prompt.title}
                          className={`border rounded-xl p-4 ${cat.bg} hover:border-opacity-50 transition-all group`}
                        >
                          <p className="text-sm font-semibold text-white mb-2">{prompt.title}</p>
                          <p className="text-xs text-gray-400 line-clamp-2 mb-4 leading-relaxed">
                            {prompt.text.split("\n")[0]}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePromptClick(prompt.text, "chat")}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-400 text-black text-xs font-bold px-3 py-2 rounded-lg hover:opacity-90 transition"
                            >
                              <MessageSquare className="w-3 h-3" />
                              Use in Chat
                            </button>
                            <button
                              onClick={() => handlePromptClick(prompt.text, "copy")}
                              title="Copy prompt"
                              className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-gray-400 hover:text-white"
                            >
                              {copiedPrompt === prompt.text
                                ? <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                                : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
                <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300 leading-relaxed">
                  <strong className="text-white">Pro tip:</strong> Replace the bracketed placeholders like{" "}
                  <code className="bg-black/30 px-1 rounded">[PASTE CODE HERE]</code> with your actual content before sending.
                  The more detail you provide, the better the fix.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ── API CREDENTIALS VAULT ── */}
        <section id="creds-section">
          <button
            onClick={() => setShowCreds((v) => !v)}
            className="w-full flex items-center justify-between mb-4 group"
          >
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              API Credentials
              <span className="text-xs font-normal text-gray-500 ml-1">
                — {Object.keys(savedCreds).length} of {CREDENTIAL_DEFS.length} saved
              </span>
            </h2>
            {showCreds
              ? <ChevronUp className="w-4 h-4 text-gray-500 group-hover:text-white transition" />
              : <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-white transition" />}
          </button>

          {showCreds && (
            <div className="space-y-3">
              {/* Info banner */}
              <div className="bg-[#111827] border border-cyan-500/20 rounded-xl p-4 flex items-start gap-3 mb-5">
                <Shield className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white mb-1">AES-256 encrypted — never exposed</p>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Every token is encrypted with AES-256 (pgcrypto) before being stored in our database.
                    The encryption key never touches the database — it lives only in our server environment.
                    Tokens are never shown again after saving, never logged, and never sent to the browser.
                    The agent decrypts them only at the moment it needs to act on your behalf.
                  </p>
                </div>
              </div>

              {CREDENTIAL_DEFS.map((def) => {
                const Icon = def.icon;
                const isSaved = !!savedCreds[def.provider];
                const saving = credSaving[def.provider];
                const deleting = credDeleting[def.provider];
                const value = credValues[def.provider] || "";
                const visible = credVisible[def.provider];

                return (
                  <div key={def.provider} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${def.color}`} />
                        <span className="text-sm font-semibold text-white">{def.label}</span>
                        {isSaved && (
                          <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/15 border border-green-500/20 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> Saved
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={def.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 transition"
                        >
                          {def.helpLabel}
                        </a>
                        {isSaved && (
                          <button
                            onClick={() => handleDeleteCredential(def.provider)}
                            disabled={deleting}
                            className="p-1 text-gray-500 hover:text-red-400 transition"
                            title="Remove credential"
                          >
                            {deleting
                              ? <Loader className="w-3.5 h-3.5 animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-3">{def.hint}</p>

                    {isSaved ? (
                      <div className="flex items-center gap-3 bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-3">
                        <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <p className="text-xs text-green-400">
                          Token saved on {new Date(savedCreds[def.provider].updated_at).toLocaleDateString()}.
                          Click the trash icon to replace it.
                        </p>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type={visible ? "text" : "password"}
                            value={value}
                            onChange={(e) => setCredValues((s) => ({ ...s, [def.provider]: e.target.value }))}
                            placeholder={def.placeholder}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 text-sm pr-10 font-mono"
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveCredential(def.provider); }}
                          />
                          <button
                            type="button"
                            onClick={() => setCredVisible((s) => ({ ...s, [def.provider]: !visible }))}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                          >
                            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          onClick={() => handleSaveCredential(def.provider)}
                          disabled={!value.trim() || saving}
                          className="bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-5 py-2.5 rounded-lg hover:opacity-90 transition disabled:opacity-40 text-sm flex items-center gap-2"
                        >
                          {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link to="/chat" className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col items-center gap-2 transition text-center group">
              <MessageSquare className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Open Chat</span>
            </Link>
            <Link to="/signup" className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col items-center gap-2 transition text-center group">
              <Plus className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">New Project</span>
            </Link>
            <a href="mailto:support@codeexpertagent.com" className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col items-center gap-2 transition text-center group">
              <FileText className="w-6 h-6 text-green-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium">Get Support</span>
            </a>
            {data?.projects && data.projects.some((p) => p.status !== "delivered") && (
              <button
                onClick={() => {
                  const refundable = data.projects.find((p) => ["pending","failed"].includes(p.status));
                  if (refundable) { setRefundProject(refundable); setShowRefundModal(true); }
                }}
                className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col items-center gap-2 transition text-center group"
              >
                <AlertCircle className="w-6 h-6 text-orange-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Request Refund</span>
              </button>
            )}
            {!data?.projects?.some((p) => p.status !== "delivered") && (
              <button onClick={handleManageSubscription} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-4 flex flex-col items-center gap-2 transition text-center group">
                <CreditCard className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Billing</span>
              </button>
            )}
          </div>
        </section>

      </main>

      {/* Refund Modal */}
      {showRefundModal && refundProject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">Request Refund</h3>
              <button onClick={() => setShowRefundModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-5">
              <p className="text-yellow-300 text-sm">
                Refund requests are reviewed within 24 hours. We'll refund the upfront fee if we haven't been able to fix your code.
              </p>
            </div>
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Reason for refund request *
              </label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none text-sm"
                placeholder="Please describe the issue and why you're requesting a refund..."
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRefundModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition text-sm">
                Cancel
              </button>
              <button
                onClick={handleRefundSubmit}
                disabled={refundSubmitting || !refundReason.trim()}
                className="flex-1 py-3 rounded-xl bg-red-500/80 hover:bg-red-500 text-white font-bold transition disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {refundSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : null}
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
