import { useState, useEffect, useCallback } from "react";
import {
  Users, CreditCard, ShoppingCart, DollarSign, Activity,
  Search, RefreshCw, Ban, CheckCircle, AlertCircle, Clock,
  Plus, Minus, X, Loader, ExternalLink, Truck,
} from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  credits?: number;
  created_at: string;
  is_banned?: boolean;
  projects?: { id: string; status: string; upfront_amount: number }[];
}

interface AdminOrder {
  id: string;
  tier: string;
  status: string;
  upfront_amount: number;
  balance_amount: number;
  description?: string;
  github_repo?: string;
  created_at: string;
  delivered_at?: string;
  users?: { email: string; name: string };
}

interface Stats {
  total_users: number;
  active_users: number;
  total_orders: number;
  pending_orders: number;
  in_progress_orders: number;
  total_revenue: number;
  this_month_revenue: number;
  active_sessions: number;
}

type Tab = "users" | "orders" | "credits" | "revenue";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtAmount(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400",
  in_progress: "bg-blue-500/20 text-blue-400",
  awaiting_payment: "bg-purple-500/20 text-purple-400",
  delivered: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState(1);
  const [creditAction, setCreditAction] = useState<"add" | "remove">("add");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const fetchAll = useCallback(async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const [statsRes, usersRes, ordersRes] = await Promise.all([
        fetch("/api/admin/stats", { headers: authHeaders }),
        fetch("/api/admin/users", { headers: authHeaders }),
        fetch("/api/admin/orders", { headers: authHeaders }),
      ]);

      if (statsRes.status === 401 || usersRes.status === 401) {
        navigate("/login");
        return;
      }

      const [statsData, usersData, ordersData] = await Promise.all([
        statsRes.json(),
        usersRes.json(),
        ordersRes.json(),
      ]);

      setStats(statsData);
      setUsers(usersData.users || []);
      setOrders(ordersData.orders || []);
    } catch (err) {
      console.error("Admin fetch error:", err);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function handleToggleFreeze(user: AdminUser) {
    setActionLoading(user.id);
    try {
      await fetch(`/api/admin/users/${user.id}/freeze`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ frozen: !user.is_banned }),
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_banned: !u.is_banned } : u))
      );
      showToast(`User ${user.is_banned ? "unfrozen" : "frozen"}`);
    } catch {
      showToast("Action failed", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreditChange() {
    if (!selectedUser) return;
    setActionLoading(selectedUser.id);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/credits`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ action: creditAction, amount: creditAmount }),
      });
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, credits: data.credits } : u))
      );
      showToast(`Credits ${creditAction === "add" ? "added" : "removed"} successfully`);
      setShowCreditModal(false);
    } catch {
      showToast("Failed to update credits", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeliver(order: AdminOrder) {
    setActionLoading(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/deliver`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: "awaiting_payment" } : o))
      );

      if (data.balanceUrl) {
        navigator.clipboard?.writeText(data.balanceUrl).catch(() => {});
      }
      showToast("Order marked as delivered. Balance link copied to clipboard!");
    } catch (err: any) {
      showToast(err.message || "Failed to deliver order", "error");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStatusChange(order: AdminOrder, status: string) {
    setActionLoading(order.id);
    try {
      await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status } : o))
      );
      showToast("Status updated");
    } catch {
      showToast("Failed to update status", "error");
    } finally {
      setActionLoading(null);
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(
    (o) =>
      (o.users?.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.tier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalRevenue = stats ? stats.total_revenue : 0;
  const thisMonthRevenue = stats ? stats.this_month_revenue : 0;

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
        <div
          className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-green-500/20 border border-green-500/40 text-green-300"
              : "bg-red-500/20 border border-red-500/40 text-red-300"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-[#0f1629] border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/images/logo.png" alt="Code Expert Agent" className="h-10 w-10 object-contain" />
            <div>
              <h1 className="text-xl font-bold">Code Expert Agent</h1>
              <span className="text-xs text-gray-400">Admin Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={fetchAll}
              disabled={refreshing}
              className="text-gray-400 hover:text-white p-2 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
            <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-blue-400">Live</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-400" />}
          label="Total Users"
          value={stats?.total_users.toString() || "0"}
          sublabel={`${stats?.active_users || 0} registered`}
        />
        <StatCard
          icon={<ShoppingCart className="w-5 h-5 text-purple-400" />}
          label="Total Orders"
          value={stats?.total_orders.toString() || "0"}
          sublabel={`${stats?.pending_orders || 0} pending`}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
          label="Total Revenue"
          value={fmtAmount(totalRevenue)}
          sublabel={`${fmtAmount(thisMonthRevenue)} this month`}
        />
        <StatCard
          icon={<Activity className="w-5 h-5 text-cyan-400" />}
          label="Agent Sessions"
          value={stats?.active_sessions?.toString() || "0"}
          sublabel="Last 24 hours"
        />
      </div>

      {/* Tabs */}
      <div className="px-6 border-b border-white/10">
        <div className="flex gap-1">
          {(["users", "orders", "credits", "revenue"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "text-blue-400 border-b-2 border-blue-400"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users, orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
          />
        </div>

        {/* ── Users Tab ── */}
        {activeTab === "users" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                {searchQuery ? "No users match your search" : "No users yet"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">User</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Role</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Credits</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Orders</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Joined</th>
                      <th className="text-right px-6 py-4 text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium">{user.name || "—"}</p>
                            <p className="text-sm text-gray-400">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-medium ${(user.credits || 0) > 0 ? "text-green-400" : "text-gray-500"}`}>
                            {user.credits || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {user.projects?.length || 0}
                        </td>
                        <td className="px-6 py-4 text-gray-400 text-sm">
                          {fmtDate(user.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setSelectedUser(user); setCreditAction("add"); setCreditAmount(1); setShowCreditModal(true); }}
                              className="p-2 hover:bg-white/10 rounded-lg text-green-400"
                              title="Add credits"
                              disabled={actionLoading === user.id}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setSelectedUser(user); setCreditAction("remove"); setCreditAmount(1); setShowCreditModal(true); }}
                              className="p-2 hover:bg-white/10 rounded-lg text-red-400"
                              title="Remove credits"
                              disabled={actionLoading === user.id}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleFreeze(user)}
                              className={`p-2 hover:bg-white/10 rounded-lg ${user.is_banned ? "text-green-400" : "text-orange-400"}`}
                              title={user.is_banned ? "Unfreeze" : "Freeze"}
                              disabled={actionLoading === user.id}
                            >
                              {actionLoading === user.id ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : user.is_banned ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : (
                                <Ban className="w-4 h-4" />
                              )}
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
        )}

        {/* ── Orders Tab ── */}
        {activeTab === "orders" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            {filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                {searchQuery ? "No orders match your search" : "No orders yet"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Customer</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Tier</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Status</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Upfront</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Balance</th>
                      <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Date</th>
                      <th className="text-right px-6 py-4 text-xs font-medium text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-white/5 transition">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-sm">{order.users?.name || "—"}</p>
                            <p className="text-xs text-gray-400">{order.users?.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-medium">
                            {order.tier}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_STYLES[order.status] || "bg-gray-500/20 text-gray-400"}`}>
                            {order.status === "pending" && <Clock className="w-3 h-3" />}
                            {order.status === "in_progress" && <Activity className="w-3 h-3" />}
                            {order.status === "delivered" && <CheckCircle className="w-3 h-3" />}
                            {order.status === "awaiting_payment" && <CreditCard className="w-3 h-3" />}
                            {order.status === "failed" && <AlertCircle className="w-3 h-3" />}
                            {order.status.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-300">{fmtAmount(order.upfront_amount)}</td>
                        <td className="px-6 py-4 text-gray-300">{fmtAmount(order.balance_amount)}</td>
                        <td className="px-6 py-4 text-gray-400 text-sm">{fmtDate(order.created_at)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {/* Status quick-change */}
                            {order.status === "pending" && (
                              <button
                                onClick={() => handleStatusChange(order, "in_progress")}
                                disabled={actionLoading === order.id}
                                className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition"
                                title="Mark In Progress"
                              >
                                {actionLoading === order.id ? <Loader className="w-3 h-3 animate-spin" /> : "Start"}
                              </button>
                            )}
                            {(order.status === "in_progress" || order.status === "pending") && (
                              <button
                                onClick={() => handleDeliver(order)}
                                disabled={actionLoading === order.id}
                                className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition flex items-center gap-1"
                                title="Mark Delivered + Send balance link"
                              >
                                {actionLoading === order.id ? (
                                  <Loader className="w-3 h-3 animate-spin" />
                                ) : (
                                  <><Truck className="w-3 h-3" /> Deliver</>
                                )}
                              </button>
                            )}
                            {order.github_repo && (
                              <a
                                href={order.github_repo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white"
                                title="View repo"
                              >
                                <ExternalLink className="w-4 h-4" />
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
        )}

        {/* ── Credits Tab ── */}
        {activeTab === "credits" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Credits Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <span className="text-gray-300">Total Credits in Circulation</span>
                  <span className="text-2xl font-bold text-green-400">
                    {users.reduce((a, u) => a + (u.credits || 0), 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <span className="text-gray-300">Users With Credits</span>
                  <span className="text-2xl font-bold text-blue-400">
                    {users.filter((u) => (u.credits || 0) > 0).length}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Top Credit Holders</h3>
              <div className="space-y-2">
                {users
                  .filter((u) => (u.credits || 0) > 0)
                  .sort((a, b) => (b.credits || 0) - (a.credits || 0))
                  .slice(0, 5)
                  .map((u) => (
                    <div key={u.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-sm text-white">{u.name || u.email}</p>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                      <span className="text-green-400 font-bold">{u.credits} cr</span>
                    </div>
                  ))}
                {users.filter((u) => (u.credits || 0) > 0).length === 0 && (
                  <p className="text-gray-500 text-sm">No users have credits yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Revenue Tab ── */}
        {activeTab === "revenue" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Revenue Breakdown</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <span className="text-gray-300">Total Upfront Collected</span>
                  <span className="text-2xl font-bold text-green-400">{fmtAmount(totalRevenue)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <span className="text-gray-300">This Month</span>
                  <span className="text-2xl font-bold text-blue-400">{fmtAmount(thisMonthRevenue)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <span className="text-gray-300">Pending Balance Revenue</span>
                  <span className="text-2xl font-bold text-purple-400">
                    {fmtAmount(
                      orders
                        .filter((o) => o.status === "awaiting_payment")
                        .reduce((s, o) => s + (o.balance_amount || 0), 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Recent Orders</h3>
              <div className="space-y-3">
                {orders.slice(0, 8).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-sm text-white">{order.users?.email || "—"}</p>
                      <p className="text-xs text-gray-400">{order.tier} · {order.status.replace(/_/g, " ")}</p>
                    </div>
                    <span className="text-green-400 font-medium text-sm">
                      +{fmtAmount(order.upfront_amount)}
                    </span>
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="text-gray-500 text-sm">No orders yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credit Modal */}
      {showCreditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">
                {creditAction === "add" ? "Add" : "Remove"} Credits
              </h3>
              <button onClick={() => setShowCreditModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 mb-2">
              {creditAction === "add" ? "Adding credits to" : "Removing credits from"}{" "}
              <strong className="text-white">{selectedUser.name || selectedUser.email}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Current balance:{" "}
              <span className="text-white font-medium">{selectedUser.credits || 0} credits</span>
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
              <input
                type="number"
                min="1"
                max="100"
                value={creditAmount}
                onChange={(e) => setCreditAmount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreditModal(false)}
                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreditChange}
                disabled={!!actionLoading}
                className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                  creditAction === "add"
                    ? "bg-green-500 hover:bg-green-400 text-black"
                    : "bg-red-500 hover:bg-red-400 text-white"
                } disabled:opacity-50`}
              >
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

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-white/10 p-2 rounded-lg">{icon}</div>
        <span className="text-gray-400 text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-xs text-gray-500">{sublabel}</div>
    </div>
  );
}
