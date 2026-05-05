import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import {
  Users, CreditCard, ShoppingCart, DollarSign, Activity, Search,
  RefreshCw, Ban, CheckCircle, AlertCircle, Clock, Plus, Minus,
  X, Loader, ExternalLink, Truck, LogOut, Star, MessageSquare,
  Bell, TrendingUp, ArrowUpRight, LayoutDashboard, Tag, Percent,
  ToggleLeft, ToggleRight, Trash2, Flame, Calendar, Hash,
} from "lucide-react";

type Tab = "overview" | "orders" | "users" | "subscriptions" | "refunds" | "promotions";

interface AdminUser {
  id: string; email: string; name: string; role: string;
  sites_rescued?: number; credits?: number; created_at: string;
  is_banned?: boolean; subscription_status?: string;
  projects?: { id: string; status: string; upfront_amount: number }[];
}

interface AdminOrder {
  id: string; tier: string; status: string; upfront_amount: number;
  balance_amount: number; description?: string; github_repo?: string;
  site_url?: string; created_at: string; delivered_at?: string;
  users?: { email: string; name: string };
}

interface RefundRequest {
  id: string; user_id: string; project_id: string; reason: string;
  status: string; created_at: string;
  users?: { email: string; name: string };
  projects?: { tier: string; upfront_amount: number };
}

interface PromoCode {
  id: string;
  code: string;
  label?: string;
  stripe_coupon_id?: string;
  stripe_promo_id?: string;
  discount_type: "percent" | "amount";
  discount_value: number;
  applies_to: string;
  max_redemptions?: number;
  times_redeemed: number;
  expires_at?: string;
  active: boolean;
  created_at: string;
}

interface Stats {
  total_users: number; active_users: number; total_orders: number;
  pending_orders: number; in_progress_orders: number;
  total_revenue: number; this_month_revenue: number;
  active_sessions: number; active_subscriptions: number;
}

const fmtAmt = (c: number) => `$${(c / 100).toFixed(2)}`;
const fmtDate = (s: string) => new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const STATUS_STYLES: Record<string, string> = {
  pending:          "bg-yellow-500/20 text-yellow-400",
  in_progress:      "bg-blue-500/20 text-blue-400",
  awaiting_payment: "bg-purple-500/20 text-purple-400",
  delivered:        "bg-green-500/20 text-green-400",
  failed:           "bg-red-500/20 text-red-400",
};

export default function AdminDashboard() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmt, setCreditAmt] = useState(1);
  const [creditAction, setCreditAction] = useState<"add" | "remove">("add");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Promo state
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromoForm, setShowPromoForm] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: "", label: "", discount_type: "percent" as "percent" | "amount",
    discount_value: 10, applies_to: "all", max_redemptions: "", expires_at: "",
  });
  const [promoSubmitting, setPromoSubmitting] = useState(false);
  const [promoDeleteConfirm, setPromoDeleteConfirm] = useState<string | null>(null);

  const authH = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const [sR, uR, oR, rR] = await Promise.all([
        fetch("/api/admin/stats", { headers: authH }),
        fetch("/api/admin/users", { headers: authH }),
        fetch("/api/admin/orders", { headers: authH }),
        fetch("/api/admin/refund-requests", { headers: authH }),
      ]);
      if (sR.status === 401) { navigate("/login"); return; }

      const [sd, ud, od, rd] = await Promise.all([sR.json(), uR.json(), oR.json(), rR.json()]);
      setStats(sd);
      setUsers(ud.users || []);
      setOrders(od.orders || []);
      setRefunds(rd.requests || []);
    } catch {
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const fetchPromos = useCallback(async () => {
    if (!token) return;
    setPromoLoading(true);
    try {
      const r = await fetch("/api/admin/promos", { headers: authH });
      const d = await r.json();
      setPromos(d.promos || []);
    } catch {
      showToast("Failed to load promo codes", "error");
    } finally {
      setPromoLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { if (activeTab === "promotions") fetchPromos(); }, [activeTab, fetchPromos]);

  const handleFreeze = async (u: AdminUser) => {
    setActionLoading(u.id);
    try {
      await fetch(`/api/admin/users/${u.id}/freeze`, {
        method: "POST", headers: authH,
        body: JSON.stringify({ frozen: !u.is_banned }),
      });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_banned: !x.is_banned } : x));
      showToast(`User ${u.is_banned ? "unfrozen" : "frozen"}`);
    } catch { showToast("Action failed", "error"); }
    finally { setActionLoading(null); }
  };

  const handleCreditChange = async () => {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    try {
      const r = await fetch(`/api/admin/users/${selectedUser.id}/credits`, {
        method: "POST", headers: authH,
        body: JSON.stringify({ action: creditAction, amount: creditAmt }),
      });
      const d = await r.json();
      setUsers((prev) => prev.map((u) => u.id === selectedUser.id ? { ...u, credits: d.credits } : u));
      showToast("Credits updated"); setShowCreditModal(false);
    } catch { showToast("Failed", "error"); }
    finally { setActionLoading(null); }
  };

  const handleDeliver = async (order: AdminOrder) => {
    setActionLoading(order.id);
    try {
      const r = await fetch(`/api/admin/orders/${order.id}/deliver`, { method: "POST", headers: authH });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status: "awaiting_payment" } : o));
      if (d.balanceUrl) navigator.clipboard?.writeText(d.balanceUrl).catch(() => {});
      showToast("Delivered! Balance link copied to clipboard.");
    } catch (e: any) { showToast(e.message || "Failed", "error"); }
    finally { setActionLoading(null); }
  };

  const handleStatusChange = async (order: AdminOrder, status: string) => {
    setActionLoading(order.id);
    try {
      await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST", headers: authH, body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => o.id === order.id ? { ...o, status } : o));
      showToast("Status updated");
    } catch { showToast("Failed", "error"); }
    finally { setActionLoading(null); }
  };

  const handleRefundAction = async (refundId: string, action: "approve" | "deny") => {
    setActionLoading(refundId);
    try {
      const r = await fetch(`/api/admin/refund-requests/${refundId}/${action}`, {
        method: "POST", headers: authH,
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setRefunds((prev) => prev.map((r) => r.id === refundId ? { ...r, status: action === "approve" ? "approved" : "denied" } : r));
      showToast(action === "approve" ? "Refund approved and processed!" : "Refund request denied.");
    } catch (e: any) { showToast(e.message || "Failed", "error"); }
    finally { setActionLoading(null); }
  };

  const handlePromoCreate = async () => {
    if (!promoForm.code.trim()) { showToast("Code is required", "error"); return; }
    if (!promoForm.discount_value || promoForm.discount_value <= 0) { showToast("Discount value must be > 0", "error"); return; }
    setPromoSubmitting(true);
    try {
      const body: any = {
        code: promoForm.code.trim().toUpperCase(),
        label: promoForm.label.trim() || undefined,
        discount_type: promoForm.discount_type,
        discount_value: promoForm.discount_type === "amount"
          ? Math.round(promoForm.discount_value * 100)  // convert dollars → cents
          : promoForm.discount_value,
        applies_to: promoForm.applies_to,
      };
      if (promoForm.max_redemptions) body.max_redemptions = parseInt(promoForm.max_redemptions);
      if (promoForm.expires_at) body.expires_at = promoForm.expires_at;

      const r = await fetch("/api/admin/promos", {
        method: "POST", headers: authH, body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setPromos((prev) => [d.promo, ...prev]);
      setShowPromoForm(false);
      setPromoForm({ code: "", label: "", discount_type: "percent", discount_value: 10, applies_to: "all", max_redemptions: "", expires_at: "" });
      showToast(`Promo code ${d.promo.code} created!`);
    } catch (e: any) { showToast(e.message || "Failed to create promo", "error"); }
    finally { setPromoSubmitting(false); }
  };

  const handlePromoToggle = async (promo: PromoCode) => {
    setActionLoading(promo.id);
    try {
      const r = await fetch(`/api/admin/promos/${promo.id}/toggle`, { method: "POST", headers: authH });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setPromos((prev) => prev.map((p) => p.id === promo.id ? d.promo : p));
      showToast(`Code ${promo.code} ${d.promo.active ? "activated" : "deactivated"}`);
    } catch (e: any) { showToast(e.message || "Failed", "error"); }
    finally { setActionLoading(null); }
  };

  const handlePromoDelete = async (promo: PromoCode) => {
    setActionLoading(promo.id);
    try {
      const r = await fetch(`/api/admin/promos/${promo.id}`, { method: "DELETE", headers: authH });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setPromos((prev) => prev.filter((p) => p.id !== promo.id));
      setPromoDeleteConfirm(null);
      showToast(`Code ${promo.code} deleted`);
    } catch (e: any) { showToast(e.message || "Failed", "error"); }
    finally { setActionLoading(null); }
  };

  const pendingRefunds = refunds.filter((r) => r.status === "pending");
  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.name || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredOrders = orders.filter((o) =>
    (o.users?.email || "").toLowerCase().includes(search.toLowerCase()) ||
    o.status.toLowerCase().includes(search.toLowerCase()) ||
    o.tier.toLowerCase().includes(search.toLowerCase())
  );

  const tabDef: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "orders", label: "Orders", badge: stats?.pending_orders },
    { id: "users", label: "Users" },
    { id: "subscriptions", label: "Subscriptions", badge: stats?.active_subscriptions },
    { id: "refunds", label: "Refund Requests", badge: pendingRefunds.length },
    { id: "promotions", label: "Promotions", badge: promos.filter(p => p.active).length || undefined },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <Loader className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl ${
          toast.type === "success" ? "bg-green-500/20 border border-green-500/40 text-green-300" : "bg-red-500/20 border border-red-500/40 text-red-300"
        }`}>{toast.msg}</div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f1629] border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <img src="/images/logo.png" alt="Code Expert Agent" className="h-10 w-10 object-contain" />
              <div className="hidden sm:block">
                <p className="text-sm font-bold leading-tight">Code Expert Agent</p>
                <p className="text-xs text-blue-400">Admin Dashboard</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            {/* ── User-side links ── */}
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition"
              title="Open user dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <Link
              to="/chat"
              className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition"
              title="Open agent chat"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </Link>

            {/* ── Mobile: single dropdown-style button ── */}
            <div className="flex sm:hidden items-center gap-1">
              <Link to="/dashboard" className="p-2 text-gray-400 hover:text-white" title="User dashboard">
                <LayoutDashboard className="w-4 h-4" />
              </Link>
              <Link to="/chat" className="p-2 text-gray-400 hover:text-white" title="Agent chat">
                <MessageSquare className="w-4 h-4" />
              </Link>
            </div>

            <div className="w-px h-5 bg-white/10" />

            {pendingRefunds.length > 0 && (
              <button onClick={() => setActiveTab("refunds")} className="relative p-2 text-orange-400 hover:bg-white/10 rounded-lg">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                  {pendingRefunds.length}
                </span>
              </button>
            )}
            <button onClick={fetchAll} disabled={refreshing} className="p-2 text-gray-400 hover:text-white disabled:opacity-50">
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-blue-400 hidden sm:block">Live</span>
            </div>
            <button onClick={() => { logout(); navigate("/"); }} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 border-b border-white/10 mb-6 overflow-x-auto">
          {tabDef.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === t.id ? "text-blue-400 border-b-2 border-blue-400" : "text-gray-400 hover:text-white"
              }`}
            >
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${t.id === "refunds" ? "bg-red-500/30 text-red-400" : "bg-blue-500/30 text-blue-300"}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Users className="w-5 h-5 text-blue-400" />} label="Total Users" value={stats?.total_users.toString() || "0"} sub="registered accounts" />
              <StatCard icon={<ShoppingCart className="w-5 h-5 text-purple-400" />} label="Total Orders" value={stats?.total_orders.toString() || "0"} sub={`${stats?.pending_orders || 0} pending`} />
              <StatCard icon={<DollarSign className="w-5 h-5 text-green-400" />} label="Total Revenue" value={fmtAmt(stats?.total_revenue || 0)} sub={`${fmtAmt(stats?.this_month_revenue || 0)} this month`} />
              <StatCard icon={<Star className="w-5 h-5 text-yellow-400" />} label="Subscriptions" value={(stats?.active_subscriptions || 0).toString()} sub="monthly active" />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button onClick={() => setActiveTab("orders")} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-5 text-left transition group">
                <div className="flex items-center justify-between mb-3">
                  <Truck className="w-6 h-6 text-blue-400" />
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-white transition" />
                </div>
                <p className="font-bold">Manage Orders</p>
                <p className="text-gray-400 text-sm">{stats?.pending_orders || 0} awaiting action</p>
              </button>
              <button onClick={() => setActiveTab("refunds")} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-5 text-left transition group">
                <div className="flex items-center justify-between mb-3">
                  <AlertCircle className={`w-6 h-6 ${pendingRefunds.length > 0 ? "text-red-400" : "text-gray-400"}`} />
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-white transition" />
                </div>
                <p className="font-bold">Refund Requests</p>
                <p className="text-gray-400 text-sm">{pendingRefunds.length} pending review</p>
              </button>
              <button onClick={() => setActiveTab("subscriptions")} className="bg-white/5 border border-white/10 hover:border-white/20 rounded-xl p-5 text-left transition group">
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-white transition" />
                </div>
                <p className="font-bold">Subscriptions</p>
                <p className="text-gray-400 text-sm">{stats?.active_subscriptions || 0} active</p>
              </button>
            </div>

            {/* Recent Orders */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Recent Orders</h3>
                <button onClick={() => setActiveTab("orders")} className="text-blue-400 text-sm hover:text-blue-300">View all →</button>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                {orders.slice(0, 5).map((o, i) => (
                  <div key={o.id} className={`flex items-center justify-between px-5 py-3 ${i < orders.slice(0, 5).length - 1 ? "border-b border-white/5" : ""}`}>
                    <div>
                      <p className="text-sm font-medium">{o.users?.email || "—"}</p>
                      <p className="text-xs text-gray-400">{o.tier} · {fmtDate(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[o.status] || "bg-gray-500/20 text-gray-400"}`}>
                        {o.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-green-400 text-sm font-medium">+{fmtAmt(o.upfront_amount)}</span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <p className="text-gray-500 text-sm p-6 text-center">No orders yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {activeTab === "orders" && (
          <div>
            <SearchBar value={search} onChange={setSearch} placeholder="Search orders..." />
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {filteredOrders.length === 0 ? (
                <p className="text-gray-400 text-center py-12">{search ? "No orders match" : "No orders yet"}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 text-xs text-gray-400 uppercase">
                      <tr>
                        {["Customer","Tier","Status","Upfront","Balance","Date","Actions"].map((h) => (
                          <th key={h} className={`px-5 py-4 font-medium text-left ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-4">
                            <p className="text-sm font-medium">{o.users?.name || "—"}</p>
                            <p className="text-xs text-gray-400">{o.users?.email}</p>
                          </td>
                          <td className="px-5 py-4"><span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">{o.tier}</span></td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[o.status] || "bg-gray-500/20 text-gray-400"}`}>
                              {o.status === "pending" && <Clock className="w-3 h-3" />}
                              {o.status === "in_progress" && <Activity className="w-3 h-3" />}
                              {o.status === "delivered" && <CheckCircle className="w-3 h-3" />}
                              {o.status === "awaiting_payment" && <CreditCard className="w-3 h-3" />}
                              {o.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-300 text-sm">{fmtAmt(o.upfront_amount)}</td>
                          <td className="px-5 py-4 text-gray-300 text-sm">{fmtAmt(o.balance_amount)}</td>
                          <td className="px-5 py-4 text-gray-400 text-sm">{fmtDate(o.created_at)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              {o.status === "pending" && (
                                <button onClick={() => handleStatusChange(o, "in_progress")} disabled={actionLoading === o.id}
                                  className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition">
                                  {actionLoading === o.id ? <Loader className="w-3 h-3 animate-spin" /> : "Start"}
                                </button>
                              )}
                              {["in_progress","pending"].includes(o.status) && (
                                <button onClick={() => handleDeliver(o)} disabled={actionLoading === o.id}
                                  className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 flex items-center gap-1 transition">
                                  {actionLoading === o.id ? <Loader className="w-3 h-3 animate-spin" /> : <><Truck className="w-3 h-3" />Deliver</>}
                                </button>
                              )}
                              {o.github_repo && (
                                <a href={o.github_repo} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeTab === "users" && (
          <div>
            <SearchBar value={search} onChange={setSearch} placeholder="Search users..." />
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              {filteredUsers.length === 0 ? (
                <p className="text-gray-400 text-center py-12">{search ? "No users match" : "No users yet"}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 text-xs text-gray-400 uppercase">
                      <tr>
                        {["User","Role","Plan","Credits","Projects","Joined","Actions"].map((h) => (
                          <th key={h} className={`px-5 py-4 font-medium text-left ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.02]">
                          <td className="px-5 py-4">
                            <p className="font-medium text-sm">{u.name || "—"}</p>
                            <p className="text-xs text-gray-400">{u.email}</p>
                          </td>
                          <td className="px-5 py-4"><span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">{u.role}</span></td>
                          <td className="px-5 py-4">
                            {u.subscription_status === "active" ? (
                              <span className="bg-green-500/20 text-green-400 px-2 py-0.5 rounded text-xs flex items-center gap-1 w-fit">
                                <Star className="w-3 h-3" />Monthly
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">One-time</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={(u.credits || 0) > 0 ? "text-green-400 font-medium" : "text-gray-500"}>
                              {u.credits || 0}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-gray-400 text-sm">{u.projects?.length || 0}</td>
                          <td className="px-5 py-4 text-gray-400 text-sm">{fmtDate(u.created_at)}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => { setSelectedUser(u); setCreditAction("add"); setCreditAmt(1); setShowCreditModal(true); }}
                                className="p-1.5 hover:bg-white/10 rounded text-green-400" title="Add credits">
                                <Plus className="w-4 h-4" />
                              </button>
                              <button onClick={() => { setSelectedUser(u); setCreditAction("remove"); setCreditAmt(1); setShowCreditModal(true); }}
                                className="p-1.5 hover:bg-white/10 rounded text-red-400" title="Remove credits">
                                <Minus className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleFreeze(u)} disabled={actionLoading === u.id}
                                className={`p-1.5 hover:bg-white/10 rounded ${u.is_banned ? "text-green-400" : "text-orange-400"}`}
                                title={u.is_banned ? "Unfreeze" : "Freeze"}>
                                {actionLoading === u.id ? <Loader className="w-4 h-4 animate-spin" /> : u.is_banned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SUBSCRIPTIONS TAB ── */}
        {activeTab === "subscriptions" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={<Star className="w-5 h-5 text-yellow-400" />} label="Active Subscriptions" value={(stats?.active_subscriptions || 0).toString()} sub="monthly recurring" />
              <StatCard icon={<DollarSign className="w-5 h-5 text-green-400" />} label="Monthly MRR" value={fmtAmt((users.filter((u) => u.subscription_status === "active").length) * 4900)} sub="estimated" />
              <StatCard icon={<TrendingUp className="w-5 h-5 text-blue-400" />} label="Churn Rate" value="—" sub="not enough data" />
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <h3 className="font-bold">Monthly Subscribers</h3>
              </div>
              {users.filter((u) => u.subscription_status === "active").length === 0 ? (
                <p className="text-gray-400 text-center py-12">No active subscribers yet</p>
              ) : (
                <div className="divide-y divide-white/5">
                  {users.filter((u) => u.subscription_status === "active").map((u) => (
                    <div key={u.id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="text-sm font-medium">{u.name || "—"}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />Active
                        </span>
                        <span className="text-green-400 text-sm font-medium">$49–$99/mo</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REFUND REQUESTS TAB ── */}
        {activeTab === "refunds" && (
          <div className="space-y-4">
            {refunds.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center text-gray-400">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <p className="font-medium">No refund requests</p>
                <p className="text-sm mt-1">All clear!</p>
              </div>
            ) : (
              refunds.map((r) => (
                <div key={r.id} className={`bg-white/5 border rounded-2xl p-5 ${r.status === "pending" ? "border-orange-500/30" : "border-white/10"}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          r.status === "pending" ? "bg-orange-500/20 text-orange-400" :
                          r.status === "approved" ? "bg-green-500/20 text-green-400" :
                          "bg-red-500/20 text-red-400"
                        }`}>{r.status.toUpperCase()}</span>
                        {r.projects?.tier && (
                          <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded-full">
                            {r.projects.tier} — {r.projects?.upfront_amount ? fmtAmt(r.projects.upfront_amount) : ""}
                          </span>
                        )}
                        <span className="text-gray-500 text-xs">{fmtDate(r.created_at)}</span>
                      </div>
                      <p className="text-sm font-medium mb-1">{r.users?.email} {r.users?.name ? `(${r.users.name})` : ""}</p>
                      <p className="text-gray-400 text-sm leading-relaxed">{r.reason}</p>
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => handleRefundAction(r.id, "approve")} disabled={actionLoading === r.id}
                          className="px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm font-medium transition flex items-center gap-1">
                          {actionLoading === r.id ? <Loader className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          Approve Refund
                        </button>
                        <button onClick={() => handleRefundAction(r.id, "deny")} disabled={actionLoading === r.id}
                          className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition flex items-center gap-1">
                          <X className="w-3.5 h-3.5" />
                          Deny
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── PROMOTIONS TAB ── */}
        {activeTab === "promotions" && (
          <div className="space-y-6">

            {/* Header row */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Tag className="w-5 h-5 text-orange-400" />
                  Promo & Discount Codes
                </h2>
                <p className="text-gray-400 text-sm mt-0.5">
                  Codes are created in Stripe and applied automatically at checkout.
                </p>
              </div>
              <button
                onClick={() => setShowPromoForm((v) => !v)}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-black font-bold px-4 py-2.5 rounded-xl text-sm transition"
              >
                <Plus className="w-4 h-4" />
                New Code
              </button>
            </div>

            {/* Create Form */}
            {showPromoForm && (
              <div className="bg-[#111827] border border-orange-500/30 rounded-2xl p-6 space-y-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-orange-400 flex items-center gap-2">
                    <Flame className="w-4 h-4" /> Create Promo Code
                  </h3>
                  <button onClick={() => setShowPromoForm(false)} className="text-gray-500 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Code */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">
                      Code <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text" placeholder="e.g. LAUNCH50"
                      value={promoForm.code}
                      onChange={(e) => setPromoForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 font-mono text-sm uppercase"
                    />
                    <p className="text-xs text-gray-500 mt-1">Customers type this at checkout</p>
                  </div>

                  {/* Label */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">
                      Internal Label
                    </label>
                    <input
                      type="text" placeholder="e.g. Launch week offer"
                      value={promoForm.label}
                      onChange={(e) => setPromoForm((f) => ({ ...f, label: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">For your reference only</p>
                  </div>

                  {/* Discount Type */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">
                      Discount Type <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPromoForm((f) => ({ ...f, discount_type: "percent" }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition flex items-center justify-center gap-2 ${
                          promoForm.discount_type === "percent"
                            ? "bg-orange-500/20 border-orange-500/50 text-orange-300"
                            : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                        }`}
                      >
                        <Percent className="w-4 h-4" /> % Off
                      </button>
                      <button
                        onClick={() => setPromoForm((f) => ({ ...f, discount_type: "amount" }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition flex items-center justify-center gap-2 ${
                          promoForm.discount_type === "amount"
                            ? "bg-green-500/20 border-green-500/50 text-green-300"
                            : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                        }`}
                      >
                        <DollarSign className="w-4 h-4" /> $ Off
                      </button>
                    </div>
                  </div>

                  {/* Discount Value */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">
                      Discount Value <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                        {promoForm.discount_type === "percent" ? "%" : "$"}
                      </span>
                      <input
                        type="number"
                        min="1"
                        max={promoForm.discount_type === "percent" ? 100 : undefined}
                        step={promoForm.discount_type === "amount" ? "0.01" : "1"}
                        value={promoForm.discount_value}
                        onChange={(e) => setPromoForm((f) => ({ ...f, discount_value: parseFloat(e.target.value) || 0 }))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50 text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {promoForm.discount_type === "percent"
                        ? `${promoForm.discount_value}% off the order total`
                        : `$${(promoForm.discount_value || 0).toFixed(2)} off the order total`}
                    </p>
                  </div>

                  {/* Applies To */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block font-medium uppercase tracking-wide">
                      Applies To
                    </label>
                    <select
                      value={promoForm.applies_to}
                      onChange={(e) => setPromoForm((f) => ({ ...f, applies_to: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50 text-sm"
                    >
                      <option value="all">All plans</option>
                      <option value="tier1">SITE Rescue only</option>
                      <option value="tier2">CODE Rescue only</option>
                      <option value="bundle">Bundle only</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Note: Stripe enforces discount at checkout</p>
                  </div>

                  {/* Max Redemptions */}
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block font-medium uppercase tracking-wide flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Max Uses
                    </label>
                    <input
                      type="number" min="1" placeholder="Unlimited"
                      value={promoForm.max_redemptions}
                      onChange={(e) => setPromoForm((f) => ({ ...f, max_redemptions: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank for unlimited uses</p>
                  </div>

                  {/* Expiry */}
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-400 mb-1.5 block font-medium uppercase tracking-wide flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Expiry Date
                    </label>
                    <input
                      type="datetime-local"
                      value={promoForm.expires_at}
                      onChange={(e) => setPromoForm((f) => ({ ...f, expires_at: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500/50 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank — code never expires</p>
                  </div>
                </div>

                {/* Preview */}
                {promoForm.code && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 text-sm">
                    <p className="text-orange-300 font-semibold mb-1">Preview</p>
                    <p className="text-gray-300">
                      Code <span className="font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded">{promoForm.code}</span>{" "}
                      gives <strong className="text-orange-300">
                        {promoForm.discount_type === "percent"
                          ? `${promoForm.discount_value}% off`
                          : `$${(promoForm.discount_value || 0).toFixed(2)} off`}
                      </strong>{" "}
                      {promoForm.applies_to === "all" ? "any plan" : `the ${promoForm.applies_to === "tier1" ? "SITE Rescue" : promoForm.applies_to === "tier2" ? "CODE Rescue" : "Bundle"} plan`}
                      {promoForm.max_redemptions ? `, up to ${promoForm.max_redemptions} uses` : ", unlimited uses"}
                      {promoForm.expires_at ? `, expires ${new Date(promoForm.expires_at).toLocaleDateString()}` : ", no expiry"}.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setShowPromoForm(false)}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePromoCreate}
                    disabled={promoSubmitting}
                    className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-black font-bold transition text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {promoSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                    {promoSubmitting ? "Creating..." : "Create Code in Stripe"}
                  </button>
                </div>
              </div>
            )}

            {/* Promo Codes List */}
            {promoLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader className="w-6 h-6 text-orange-400 animate-spin" />
              </div>
            ) : promos.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <Tag className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="font-medium text-gray-400">No promo codes yet</p>
                <p className="text-sm text-gray-600 mt-1">Click "New Code" to create your first discount code.</p>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <h3 className="font-bold text-sm">
                    {promos.filter(p => p.active).length} Active · {promos.filter(p => !p.active).length} Inactive
                  </h3>
                  <button onClick={fetchPromos} className="text-gray-400 hover:text-white">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 text-xs text-gray-400 uppercase">
                      <tr>
                        {["Code", "Discount", "Applies To", "Uses", "Expires", "Status", "Actions"].map((h) => (
                          <th key={h} className={`px-5 py-3.5 font-medium text-left ${h === "Actions" ? "text-right" : ""}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {promos.map((promo) => (
                        <tr key={promo.id} className={`hover:bg-white/[0.02] ${!promo.active ? "opacity-50" : ""}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white bg-white/10 px-2.5 py-1 rounded-lg text-sm tracking-wide">
                                {promo.code}
                              </span>
                            </div>
                            {promo.label && <p className="text-xs text-gray-500 mt-1">{promo.label}</p>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`font-bold text-lg ${promo.discount_type === "percent" ? "text-orange-400" : "text-green-400"}`}>
                              {promo.discount_type === "percent"
                                ? `${promo.discount_value}% off`
                                : `$${(promo.discount_value / 100).toFixed(2)} off`}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs capitalize">
                              {promo.applies_to === "all" ? "All Plans" : promo.applies_to === "tier1" ? "SITE" : promo.applies_to === "tier2" ? "CODE" : "Bundle"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm">
                            <span className="text-white font-medium">{promo.times_redeemed}</span>
                            <span className="text-gray-500">
                              {promo.max_redemptions ? ` / ${promo.max_redemptions}` : " / ∞"}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-400">
                            {promo.expires_at ? fmtDate(promo.expires_at) : <span className="text-gray-600">Never</span>}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                              promo.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                            }`}>
                              {promo.active ? <CheckCircle className="w-3 h-3" /> : <X className="w-3 h-3" />}
                              {promo.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handlePromoToggle(promo)}
                                disabled={actionLoading === promo.id}
                                title={promo.active ? "Deactivate" : "Activate"}
                                className={`p-1.5 rounded hover:bg-white/10 transition ${promo.active ? "text-green-400" : "text-gray-500"}`}
                              >
                                {actionLoading === promo.id
                                  ? <Loader className="w-4 h-4 animate-spin" />
                                  : promo.active
                                  ? <ToggleRight className="w-5 h-5" />
                                  : <ToggleLeft className="w-5 h-5" />}
                              </button>
                              {promoDeleteConfirm === promo.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handlePromoDelete(promo)}
                                    disabled={actionLoading === promo.id}
                                    className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs font-bold transition"
                                  >
                                    Confirm
                                  </button>
                                  <button
                                    onClick={() => setPromoDeleteConfirm(null)}
                                    className="px-2 py-1 bg-white/5 text-gray-400 hover:bg-white/10 rounded text-xs transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setPromoDeleteConfirm(promo.id)}
                                  title="Delete"
                                  className="p-1.5 rounded hover:bg-white/10 text-red-400/60 hover:text-red-400 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-300/80">
              <p className="font-semibold text-blue-300 mb-1 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> How it works
              </p>
              <ul className="space-y-1 text-xs text-blue-300/70 list-disc list-inside">
                <li>Codes are created directly in your Stripe account as Promotion Codes</li>
                <li>Customers enter the code on the Stripe checkout page</li>
                <li>Stripe applies the discount automatically — no extra code needed</li>
                <li>Deactivating a code instantly disables it in Stripe</li>
                <li>Deleting a code archives it in Stripe and removes it from this list</li>
              </ul>
            </div>

          </div>
        )}

      </div>

      {/* Credit Modal */}
      {showCreditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold">{creditAction === "add" ? "Add" : "Remove"} Credits</h3>
              <button onClick={() => setShowCreditModal(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-gray-400 text-sm mb-1">{creditAction === "add" ? "Adding to" : "Removing from"}{" "}
              <strong className="text-white">{selectedUser.name || selectedUser.email}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-4">Current: <span className="text-white font-medium">{selectedUser.credits || 0} credits</span></p>
            <input type="number" min="1" max="100" value={creditAmt}
              onChange={(e) => setCreditAmt(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-5 focus:outline-none focus:border-blue-500/50" />
            <div className="flex gap-3">
              <button onClick={() => setShowCreditModal(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition">Cancel</button>
              <button onClick={handleCreditChange} disabled={!!actionLoading}
                className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 ${creditAction === "add" ? "bg-green-500 hover:bg-green-400 text-black" : "bg-red-500 hover:bg-red-400 text-white"}`}>
                {actionLoading ? <Loader className="w-4 h-4 animate-spin" /> : null}
                {creditAction === "add" ? "Add Credits" : "Remove Credits"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-white/10 p-2 rounded-lg">{icon}</div>
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-gray-500">{sub}</div>
    </div>
  );
}

function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-5">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input type="text" placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 text-sm" />
    </div>
  );
}
