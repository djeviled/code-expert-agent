import { useAuth } from "../lib/auth-context";
import AgentChat from "../components/agent-chat";
import { LogOut } from "lucide-react";

export default function ChatPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <a href="/" className="text-gray-400 hover:text-white transition text-sm">← Back to home</a>
            <div className="h-4 w-px bg-white/20" />
            <span className="text-gray-400 text-sm">Welcome, {user?.name || user?.email}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>

        <div className="h-[calc(100vh-160px)] rounded-xl overflow-hidden">
          <AgentChat userEmail={user?.email || ""} />
        </div>
      </div>
    </div>
  );
}