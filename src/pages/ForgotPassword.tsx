import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader, CheckCircle, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send reset link");
        return;
      }

      setIsSubmitted(true);
      toast.success("Check your email for reset instructions");
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
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
            <h1 className="text-2xl font-bold text-white mb-3">Check Your Email</h1>
            <p className="text-gray-400 text-sm leading-relaxed mb-2">
              We've sent a password reset link to{" "}
              <span className="text-white font-medium">{email}</span>.
            </p>
            <p className="text-gray-500 text-xs mb-8">
              The link will expire in 24 hours. Check your spam folder if you don't see it.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold py-3 rounded-xl hover:opacity-90 transition"
            >
              Back to Login
            </button>
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
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Forgot Password?</h1>
              <p className="text-gray-400 text-sm">Enter your email to receive a reset link</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="ada@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold py-4 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
