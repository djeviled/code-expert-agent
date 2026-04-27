import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader, CheckCircle, AlertCircle, CreditCard } from "lucide-react";

export default function PayBalancePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "ready" | "paying" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  const order_id = searchParams.get("order_id");
  const tier = searchParams.get("tier");
  const email = searchParams.get("email");

  useEffect(() => {
    if (!order_id || !tier || !email) {
      setError("Missing order information");
      setStatus("error");
      return;
    }

    setOrderId(order_id);

    // Fetch the balance payment client secret from our API
    fetch(`/api/admin/orders/${order_id}/deliver`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order_id, tier, customerEmail: email }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          setStatus("error");
        } else {
          setClientSecret(data.clientSecret);
          setStatus("ready");
        }
      })
      .catch((err) => {
        setError("Failed to load payment");
        setStatus("error");
      });
  }, [order_id, tier, email]);

  const tierLabels: Record<string, string> = {
    tier1: "Tier 1 — Site Live on Vercel",
    tier2: "Tier 2 — Code Without Errors",
    bundle: "Bundle — 2 Sites",
  };

  const balanceAmounts: Record<string, string> = {
    tier1: "$150",
    tier2: "$220",
    bundle: "$250",
  };

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-white mb-4">Payment Error</h1>
          <p className="text-gray-400 mb-8">{error}</p>
          <a href="/" className="bg-blue-500 text-black font-bold px-6 py-3 rounded-lg">
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/images/logo.png" alt="Code Expert Agent" className="h-16 w-16 mx-auto mb-4 object-contain" />
          <h1 className="text-3xl font-bold text-white mb-2">Balance Payment</h1>
          <p className="text-gray-400">Your site is ready! Complete your payment to unlock delivery.</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400">Service</span>
            <span className="text-white font-medium">{tierLabels[tier || ""] || tier}</span>
          </div>
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-400">Balance Due</span>
            <span className="text-3xl font-bold text-green-400">{balanceAmounts[tier || ""] || "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Order ID</span>
            <span className="text-white font-mono text-sm">{orderId}</span>
          </div>
        </div>

        {status === "loading" || status === "ready" ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            {status === "loading" ? (
              <>
                <Loader className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
                <p className="text-gray-400">Preparing payment...</p>
              </>
            ) : (
              <>
                <CreditCard className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <p className="text-gray-400 mb-6">Your payment method will be processed securely via Stripe.</p>
                <a
                  href={clientSecret ? `https://checkout.stripe.com/pay/${clientSecret}` : "#"}
                  className="block w-full bg-gradient-to-r from-green-500 to-emerald-400 text-black font-bold py-4 rounded-xl text-center hover:opacity-90 transition"
                >
                  Pay {balanceAmounts[tier || ""]} Now
                </a>
              </>
            )}
          </div>
        ) : status === "success" ? (
          <div className="bg-white/5 border border-green-500/30 rounded-2xl p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-4">Payment Complete!</h2>
            <p className="text-gray-400 mb-8">Thank you! Your site access has been activated.</p>
            <a href="/chat" className="inline-flex items-center gap-2 bg-blue-500 text-black font-bold px-8 py-4 rounded-xl">
              Start Chatting <span>→</span>
            </a>
          </div>
        ) : null}

        <p className="text-center text-gray-500 text-sm mt-6">
          Secured by Stripe. Your payment information is never stored on our servers.
        </p>
      </div>
    </div>
  );
}