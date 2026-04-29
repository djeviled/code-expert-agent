import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import {
  MessageSquare, Plus, Clock, CheckCircle, AlertCircle, CreditCard,
  Activity, LogOut, ChevronRight, RefreshCw, ExternalLink, Zap,
  Shield, Star, X, Loader, FileText,
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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; desc: string }> = {
  pending: {
    label: "Awaiting Start",
    color: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
    icon: Clock,
    desc: "Your project is queued. We'll start work shortly.",
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    icon: Activity,
    desc: "Our agent is actively working on your project.",
  },
  awaiting_payment: {
    label: "Awaiting Balance Payment",
    color: "text-purple-400 bg-purple-500/15 border-purple-500/30",
    icon: CreditCard,
    desc: "Your project has been delivered! Pay the balance to access everything.",
  },
  delivered: {
    label: "Delivered ✓",
    color: "text-green-400 bg-green-500/15 border-green-500/30",
    icon: CheckCircle,
    desc: "Your project is live and fully delivered.",
  },
  failed: {
    label: "Needs Attention",
    color: "text-red-400 bg-red-500/15 border-red-500/30",
    icon: AlertCircle,
    desc: "There was an issue. Contact support for a refund or retry.",
  },
};

const TIER_LABELS: Record<string, string> = {
  SITE: "SITE Rescue",
  CODE: "CODE Rescue",
  BUNDLE: "Bundle Rescue",
};

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundProject, setRefundProject] = useState<Project | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

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

        {/* No projects yet */}
        {!data?.projects?.length && (
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
