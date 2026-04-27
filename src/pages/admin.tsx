import { useState, useEffect } from "react";
import { Users, CreditCard, ShoppingCart, DollarSign, Activity, Search, RefreshCw, Ban, CheckCircle, AlertCircle, Clock, Eye, Plus, Minus, X } from "lucide-react";

// Mock data - in production, fetch from Supabase
const MOCK_USERS = [
  { id: "1", email: "ada@example.com", name: "Ada Lovelace", credits: 2, status: "active", created_at: "2025-04-20", total_spent: 348 },
  { id: "2", email: "alan@example.com", name: "Alan Turing", credits: 0, status: "active", created_at: "2025-04-22", total_spent: 199 },
  { id: "3", email: "grace@example.com", name: "Grace Hopper", credits: 1, status: "frozen", created_at: "2025-04-18", total_spent: 498 },
  { id: "4", email: "tim@example.com", name: "Tim Berners-Lee", credits: 0, status: "active", created_at: "2025-04-25", total_spent: 0 },
];

const MOCK_ORDERS = [
  { id: "ord_1", user: "ada@example.com", tier: "tier2", status: "delivered", amount: 299, created_at: "2025-04-20" },
  { id: "ord_2", user: "alan@example.com", tier: "tier1", status: "pending", amount: 199, created_at: "2025-04-22" },
  { id: "ord_3", user: "grace@example.com", tier: "bundle", status: "in_progress", amount: 329, created_at: "2025-04-18" },
  { id: "ord_4", user: "tim@example.com", tier: "tier1", status: "refunded", amount: 49, created_at: "2025-04-25" },
];

const MOCK_STATS = {
  total_users: 127,
  active_users: 98,
  total_orders: 234,
  pending_orders: 12,
  total_revenue: 45680,
  this_month_revenue: 8920,
};

type Tab = "users" | "orders" | "credits" | "revenue";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [users, setUsers] = useState(MOCK_USERS);
  const [orders] = useState(MOCK_ORDERS);
  const [stats] = useState(MOCK_STATS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<typeof MOCK_USERS[0] | null>(null);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditAction, setCreditAction] = useState<"add" | "remove">("add");

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleStatus = (userId: string) => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { ...u, status: u.status === "active" ? "frozen" : "active" }
        : u
    ));
  };

  const handleCreditChange = () => {
    if (!selectedUser) return;
    const amount = creditAction === "add" ? creditAmount : -creditAmount;
    setUsers(users.map(u => 
      u.id === selectedUser.id 
        ? { ...u, credits: Math.max(0, u.credits + amount) }
        : u
    ));
    setShowCreditModal(false);
    setCreditAmount(0);
  };

  const openCreditModal = (user: typeof MOCK_USERS[0], action: "add" | "remove") => {
    setSelectedUser(user);
    setCreditAction(action);
    setCreditAmount(0);
    setShowCreditModal(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
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
            <button className="text-gray-400 hover:text-white p-2">
              <RefreshCw className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-blue-400">System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6">
        <StatCard 
          icon={<Users className="w-5 h-5 text-blue-400" />}
          label="Total Users"
          value={stats.total_users.toString()}
          sublabel={`${stats.active_users} active`}
        />
        <StatCard 
          icon={<ShoppingCart className="w-5 h-5 text-purple-400" />}
          label="Total Orders"
          value={stats.total_orders.toString()}
          sublabel={`${stats.pending_orders} pending`}
        />
        <StatCard 
          icon={<DollarSign className="w-5 h-5 text-green-400" />}
          label="Total Revenue"
          value={`$${(stats.total_revenue / 100).toLocaleString()}`}
          sublabel={`$${(stats.this_month_revenue / 100).toLocaleString()} this month`}
        />
        <StatCard 
          icon={<Activity className="w-5 h-5 text-cyan-400" />}
          label="Active Sessions"
          value="8"
          sublabel="Real-time"
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
        {/* Search Bar */}
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

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">User</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Credits</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Spent</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Joined</th>
                  <th className="text-right px-6 py-4 text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-blue-400" />
                        <span className={user.credits > 0 ? "text-green-400" : "text-gray-400"}>
                          {user.credits} credits
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === "active" 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {user.status === "active" ? (
                          <><CheckCircle className="w-3 h-3" /> Active</>
                        ) : (
                          <><Ban className="w-3 h-3" /> Frozen</>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">${user.total_spent}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{user.created_at}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openCreditModal(user, "add")}
                          className="p-2 hover:bg-white/10 rounded-lg text-green-400"
                          title="Add credits"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openCreditModal(user, "remove")}
                          className="p-2 hover:bg-white/10 rounded-lg text-red-400"
                          title="Remove credits"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(user.id)}
                          className={`p-2 hover:bg-white/10 rounded-lg ${
                            user.status === "active" ? "text-red-400" : "text-green-400"
                          }`}
                          title={user.status === "active" ? "Freeze user" : "Unfreeze user"}
                        >
                          {user.status === "active" ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Order</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Customer</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Tier</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Amount</th>
                  <th className="text-left px-6 py-4 text-xs font-medium text-gray-400 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition">
                    <td className="px-6 py-4 font-mono text-sm text-blue-400">{order.id}</td>
                    <td className="px-6 py-4 text-gray-300">{order.user}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-medium">
                        {order.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === "delivered" ? "bg-green-500/20 text-green-400" :
                        order.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                        order.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
                        "bg-red-500/20 text-red-400"
                      }`}>
                        {order.status === "delivered" && <CheckCircle className="w-3 h-3" />}
                        {order.status === "pending" && <Clock className="w-3 h-3" />}
                        {order.status === "in_progress" && <Activity className="w-3 h-3" />}
                        {order.status === "refunded" && <AlertCircle className="w-3 h-3" />}
                        {order.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">${order.amount}</td>
                    <td className="px-6 py-4 text-gray-400 text-sm">{order.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Credits Tab */}
        {activeTab === "credits" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Credits Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <span className="text-gray-300">Total Credits in Circulation</span>
                  <span className="text-2xl font-bold text-green-400">{users.reduce((a, u) => a + u.credits, 0)}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <span className="text-gray-300">Used This Month</span>
                  <span className="text-2xl font-bold text-blue-400">47</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-left transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-green-400" />
                    <span>Add Credits to User</span>
                  </div>
                  <span className="text-gray-500">→</span>
                </button>
                <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-left transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Minus className="w-5 h-5 text-red-400" />
                    <span>Remove Credits from User</span>
                  </div>
                  <span className="text-gray-500">→</span>
                </button>
                <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 text-left transition flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-blue-400" />
                    <span>Bulk Credit Operations</span>
                  </div>
                  <span className="text-gray-500">→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Tab */}
        {activeTab === "revenue" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Revenue Breakdown</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <span className="text-gray-300">Total Revenue</span>
                  <span className="text-2xl font-bold text-green-400">$45,680</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <span className="text-gray-300">This Month</span>
                  <span className="text-2xl font-bold text-blue-400">$8,920</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <span className="text-gray-300">Average Order Value</span>
                  <span className="text-2xl font-bold text-purple-400">$195</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Recent Transactions</h3>
              <div className="space-y-3">
                {orders.filter(o => o.status !== "refunded").map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <p className="text-sm text-white">{order.user}</p>
                      <p className="text-xs text-gray-400">{order.tier} • {order.status}</p>
                    </div>
                    <span className="text-green-400 font-medium">+${order.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Credit Modal */}
      {showCreditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">
                {creditAction === "add" ? "Add" : "Remove"} Credits
              </h3>
              <button 
                onClick={() => setShowCreditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 mb-4">
              {creditAction === "add" ? "Adding" : "Removing"} credits for <strong className="text-white">{selectedUser.name}</strong>
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Current balance: <span className="text-white font-medium">{selectedUser.credits} credits</span>
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Amount</label>
              <input
                type="number"
                min="1"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
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
                className={`flex-1 py-3 rounded-xl font-bold transition ${
                  creditAction === "add"
                    ? "bg-green-500 hover:bg-green-400 text-black"
                    : "bg-red-500 hover:bg-red-400 text-white"
                }`}
              >
                {creditAction === "add" ? "Add Credits" : "Remove Credits"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel: string }) {
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