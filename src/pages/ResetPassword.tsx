import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader, AlertCircle, KeyRound, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [isDone, setIsDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase sends recovery tokens in the URL hash: #access_token=...&type=recovery
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const token = params.get("access_token");
    const type = params.get("type");

    if (token && type === "recovery") {
      setAccessToken(token);
    } else {
      setIsTokenValid(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: accessToken, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to update password");
        return;
      }

      setIsDone(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/login"), 2000);
    } catch (error) {
      toast.error("An error occurred while updating password");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <Link to="/" className="flex items-center justify-center gap-3 mb-12">
            <img src="/images/logo.png" alt="Code Expert Agent" className="h-12 w-12 object-contain" />
            <span className="text-2xl font-bold text-white">Code Expert Agent</span>
          </Link>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Invalid Reset Link</h1>
            <p className="text-gray-400 text-sm mb-8">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <button
              onClick={() => navigate("/forgot-password")}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold py-3 rounded-xl hover:opacity-90 transition"
            >
              Request New Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <Link to="/" className="flex items-center justify-center gap-3 mb-12">
            <img src="/images/logo.png" alt="Code Expert Agent" className="h-12 w-12 object-contain" />
            <span className="text-2xl font-bold text-white">Code Expert Agent</span>
          </Link>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">Password Updated!</h1>
            <p className="text-gray-400 text-sm mb-2">
              Your password has been successfully updated.
            </p>
            <p className="text-gray-500 text-xs">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-3 mb-12">
          <img src="/images/logo.png" alt="Code Expert Agent" className="h-12 w-12 object-contain" />
          <span className="text-2xl font-bold text-white">Code Expert Agent</span>
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Reset Password</h1>
              <p className="text-gray-400 text-sm">Enter your new password below</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold py-4 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
