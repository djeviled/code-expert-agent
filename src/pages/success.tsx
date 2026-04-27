import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, ArrowRight, Loader, Copy, Zap } from "lucide-react";

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const tier = searchParams.get("tier") || "tier1";

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-8">
      <div className="w-full max-w-lg text-center">
        {/* Success Icon */}
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
            <Zap className="w-5 h-5 text-black" />
          </div>
        </div>

        <h1 className="text-4xl font-extrabold mb-4">Payment Confirmed!</h1>
        <p className="text-gray-400 mb-2">
          Your rescue mission is now active. We've received your <strong className="text-white">{tier === "bundle" ? "Bundle" : "Tier " + tier}</strong> upfront payment.
        </p>

        {/* What's Next */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-400" />
            What happens next
          </h3>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Check your email</p>
                <p className="text-gray-400 text-sm">We've sent you a confirmation with next steps.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="text-white font-medium">Share your code</p>
                <p className="text-gray-400 text-sm">Upload your broken project via the chat or email us the details.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-400 font-bold text-sm">3</span>
              </div>
              <div>
                <p className="text-white font-medium">We fix it</p>
                <p className="text-gray-400 text-sm">Our agent analyzes and repairs your code. You'll get updates as we work.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-green-400 font-bold text-sm">✓</span>
              </div>
              <div>
                <p className="text-white font-medium">Site goes live</p>
                <p className="text-gray-400 text-sm">Deployed on Vercel. Once it's running, you pay the balance.</p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col gap-3">
          <a
            href="/chat"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-8 py-4 rounded-xl hover:opacity-90 transition"
          >
            Start Chat Now <ArrowRight className="w-5 h-5" />
          </a>
          <button
            onClick={() => navigate("/")}
            className="text-gray-400 hover:text-white py-2 transition text-sm"
          >
            Back to Home
          </button>
        </div>

        {sessionId && (
          <p className="text-gray-600 text-xs mt-8">Session: {sessionId}</p>
        )}
      </div>
    </div>
  );
}