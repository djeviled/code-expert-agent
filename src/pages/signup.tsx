import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { PRICING_TIERS } from "../lib/pricing";
import { Check, Lock, Loader, Zap, Shield, ArrowLeft } from "lucide-react";

export default function SignupPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    projectUrl: "",
    projectDescription: "",
  });

  const tierId = searchParams.get("tier") || "tier1";
  const tier = PRICING_TIERS.find((t) => t.id === tierId) || PRICING_TIERS[0];

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.name) return;
    setError(null);
    setStep(2);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: tier.priceId,
          tier: tier.id,
          userEmail: formData.email,
          userName: formData.name,
          projectDescription: formData.projectDescription,
          projectUrl: formData.projectUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to create checkout. Please try again.");
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned. Please contact support.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Link to="/" className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Code Expert Agent" className="h-10 w-10 object-contain" />
            <div>
              <span className="text-xl font-bold">Code Expert Agent</span>
              <span className="block text-xs text-gray-400">AI-Powered Code Rescue</span>
            </div>
          </Link>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 1 ? "bg-blue-500 text-black" : "bg-white/10 text-gray-400"
              }`}
            >
              {step > 1 ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <span className={`text-sm ${step >= 1 ? "text-white" : "text-gray-400"}`}>
              Your Details
            </span>
          </div>
          <div className="w-12 h-0.5 bg-white/20" />
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= 2 ? "bg-blue-500 text-black" : "bg-white/10 text-gray-400"
              }`}
            >
              2
            </div>
            <span className={`text-sm ${step >= 2 ? "text-white" : "text-gray-400"}`}>
              Payment
            </span>
          </div>
        </div>

        {/* Selected Plan */}
        <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-blue-400 font-medium uppercase tracking-wide">
                Selected Plan
              </div>
              <h3 className="text-lg font-bold text-white">{tier.name}</h3>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold text-white">{tier.price.upfront}</div>
              <div className="text-gray-400 text-xs">upfront today</div>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 mb-3">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-300">
              + {tier.price.onDelivery} due on successful delivery
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tier.features.slice(0, 3).map((f, i) => (
              <span
                key={i}
                className="text-xs bg-white/10 text-gray-300 px-2 py-1 rounded-full flex items-center gap-1"
              >
                <Check className="w-3 h-3 text-blue-400" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-xl">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        {step === 1 ? (
          <form onSubmit={handleStep1} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                placeholder="Ada Lovelace"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                placeholder="ada@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                GitHub / Project URL{" "}
                <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="url"
                value={formData.projectUrl}
                onChange={(e) => setFormData({ ...formData, projectUrl: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
                placeholder="https://github.com/you/your-project"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Describe what's broken{" "}
                <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <textarea
                value={formData.projectDescription}
                onChange={(e) =>
                  setFormData({ ...formData, projectDescription: e.target.value })
                }
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 resize-none"
                rows={3}
                placeholder="e.g. Build fails with TypeScript errors, Supabase connection won't work..."
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold py-4 rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              Continue to Payment →
            </button>
            <p className="text-center text-gray-500 text-sm">
              Already rescued your code?{" "}
              <Link to="/login" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleCheckout} className="space-y-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-3">
              <Lock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-gray-300 text-sm font-medium">Secured by Stripe</p>
                <p className="text-gray-500 text-xs mt-0.5">
                  We never store your card details. All payments are processed securely by Stripe.
                </p>
              </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-400 text-sm font-medium">Risk-free guarantee</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Can't fix your code? Full refund of the {tier.price.upfront} upfront fee. The{" "}
                  {tier.price.onDelivery} balance is ONLY charged on successful delivery.
                </p>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Name</span>
                <span className="text-white">{formData.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Email</span>
                <span className="text-white">{formData.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Plan</span>
                <span className="text-white">{tier.name}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-white/10 pt-2 mt-2">
                <span className="text-gray-400 font-medium">Paying today</span>
                <span className="text-white font-bold">{tier.price.upfront}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold py-4 rounded-xl hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Redirecting to Stripe...
                </>
              ) : (
                <>Pay {tier.price.upfront} Now →</>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-gray-400 hover:text-white py-2 transition text-sm flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to edit details
            </button>
          </form>
        )}

        <p className="text-center text-gray-600 text-xs mt-6">
          By continuing, you agree to our{" "}
          <a href="#" className="text-blue-400 hover:text-blue-300">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-blue-400 hover:text-blue-300">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
