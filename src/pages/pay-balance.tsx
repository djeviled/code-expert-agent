import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Loader, CheckCircle, AlertCircle, CreditCard, Shield } from "lucide-react";

const TIER_LABELS: Record<string, string> = {
  tier1: "SITE Rescue",
  tier2: "CODE Rescue",
  bundle: "Bundle — Site + Code",
  site: "SITE Rescue",
  code: "CODE Rescue",
  SITE: "SITE Rescue",
  CODE: "CODE Rescue",
  BUNDLE: "Bundle — Site + Code",
};

const BALANCE_AMOUNTS: Record<string, string> = {
  tier1: "$99",
  tier2: "$149",
  bundle: "$149",
  site: "$99",
  code: "$149",
  SITE: "$99",
  CODE: "$149",
  BUNDLE: "$149",
};

export default function PayBalancePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready" | "redirecting" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams.get("order_id");
  const tier = searchParams.get("tier") || "tier1";
  const email = searchParams.get("email") || "";

  useEffect(() => {
    if (!orderId || !tier || !email) {
      setError("Missing order information. Please use the link sent to your email.");
      setStatus("error");
      return;
    }
    setStatus("ready");
  }, [orderId, tier, email]);

  const handlePayNow = async () => {
    if (!orderId || !tier || !email) return;

    setStatus("redirecting");
    setError(null);

    try {
      const res = await fetch("/api/payments/balance-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, tier, email }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to create payment session. Please try again.");
        setStatus("ready");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No checkout URL returned. Please contact support.");
        setStatus("ready");
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
      setStatus("ready");
    }
  };

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Link Error</h1>
          <p className="text-gray-400 mb-8">{error}</p>
          <Link
            to="/"
            className="inline-block bg-blue-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-blue-400 transition"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-3 mb-6">
            <img
              src="/images/logo.png"
              alt="Code Expert Agent"
              className="h-14 w-14 object-contain"
            />
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">Balance Payment</h1>
          <p className="text-gray-400">
            Your project has been delivered! Complete your payment to finalise.
          </p>
        </div>

        {/* Order Summary */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Service</span>
            <span className="text-white font-medium">
              {TIER_LABELS[tier] || tier}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Customer</span>
            <span className="text-white font-mono text-sm">{email}</span>
          </div>
          <div className="border-t border-white/10 pt-4 flex justify-between items-center">
            <span className="text-gray-400 font-medium">Balance Due</span>
            <span className="text-3xl font-extrabold text-green-400">
              {BALANCE_AMOUNTS[tier] || "—"}
            </span>
          </div>
          {orderId && (
            <div className="flex justify-between items-center">
              <span className="text-gray-400 text-sm">Order ID</span>
              <span className="text-gray-500 font-mono text-xs">{orderId}</span>
            </div>
          )}
        </div>

        {/* Success guarantee */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-green-400 text-sm font-medium">Delivery Confirmed</p>
            <p className="text-gray-400 text-xs mt-1">
              Your code has been fixed and deployed. This balance is only due because we delivered.
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={handlePayNow}
          disabled={status !== "ready"}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-400 text-black font-bold py-4 rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
        >
          {status === "redirecting" ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Redirecting to Stripe...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pay {BALANCE_AMOUNTS[tier] || ""} Now
            </>
          )}
        </button>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 mt-6 text-gray-500 text-sm">
          <Shield className="w-4 h-4" />
          <span>Secured by Stripe. Your card is never stored on our servers.</span>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          Questions?{" "}
          <a href="mailto:support@codeexpertagent.com" className="text-blue-400 hover:text-blue-300">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
