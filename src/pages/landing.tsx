import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowRight, Zap, Shield, Clock } from "lucide-react";

// Direct Stripe Payment Links (pre-configured in Stripe dashboard)
const UPFRONT_LINKS = {
  site: "https://buy.stripe.com/fZu3cv2NLdht7Yt1CVcV200",
  code: "https://buy.stripe.com/fZu28rdsp3GT92xbdvcV201",
  bundle: "https://buy.stripe.com/00w00j5ZX4KX0w1dlDcV202",
};

const TIERS = [
  {
    key: "site",
    name: "SITE Rescue",
    tagline: "Your AI-generated site, broken and stalled?",
    upfront: "$49",
    balance: "$99",
    total: "$148",
    features: [
      "Agent analyzes your broken site code",
      "Fixes errors and dependency issues",
      "Deploys successfully to Vercel",
      "Code delivered error-free",
    ],
    cta: "Start Site Rescue",
    upfrontLink: UPFRONT_LINKS.site,
  },
  {
    key: "code",
    name: "CODE Rescue",
    tagline: "Your code almost works — but won't compile?",
    upfront: "$79",
    balance: "$149",
    total: "$228",
    features: [
      "Agent digs into your broken AI code",
      "Fixes syntax, logic, and integration errors",
      "Zero errors guaranteed",
      "Code review report included",
    ],
    cta: "Start Code Rescue",
    upfrontLink: UPFRONT_LINKS.code,
    highlighted: true,
  },
  {
    key: "bundle",
    name: "Bundle",
    tagline: "Site + Code — everything rescued together",
    upfront: "$79",
    balance: "$149",
    total: "$228",
    features: [
      "Agent fixes your site AND code together",
      "Full deployment to Vercel",
      "Everything delivered error-free",
      "Priority support",
    ],
    cta: "Start Bundle Rescue",
    upfrontLink: UPFRONT_LINKS.bundle,
  },
];

const HOW_STEPS = [
  {
    num: "01",
    icon: <Zap className="w-6 h-6 text-blue-400" />,
    title: "You Describe the Problem",
    desc: "Tell our agent what's broken — paste code, describe the error, share a GitHub link.",
  },
  {
    num: "02",
    icon: <Clock className="w-6 h-6 text-cyan-400" />,
    title: "Agent Goes to Work",
    desc: "Our agent analyzes your code, finds the dead ends, and systematically fixes every issue.",
  },
  {
    num: "03",
    icon: <Check className="w-6 h-6 text-green-400" />,
    title: "Code Gets Deployed",
    desc: "Agent deploys your working application to Vercel. You get the live URL + clean code.",
  },
];

export default function LandingPage() {
  const [, setHovered] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/10 sticky top-0 bg-[#0a0a1a]/95 backdrop-blur-sm z-40">
        <div className="flex items-center gap-3">
          <img
            src="/images/logo.png"
            alt="Code Expert Agent"
            className="h-9 w-9 object-contain"
          />
          <span className="text-lg font-bold">Code Expert Agent</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <a
            href="#how"
            className="hidden md:block text-gray-400 hover:text-white transition text-sm"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="hidden md:block text-gray-400 hover:text-white transition text-sm"
          >
            Pricing
          </a>
          <Link
            to="/login"
            className="text-gray-400 hover:text-white transition text-sm"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="bg-blue-500 hover:bg-blue-400 text-black font-bold px-4 py-2 rounded-lg transition text-sm"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-6 md:px-8 py-24 md:py-32">
        <div className="inline-flex items-center gap-2 bg-blue-500/15 text-blue-400 text-sm font-medium px-4 py-2 rounded-full mb-8 border border-blue-500/30">
          <Zap className="w-4 h-4" />
          AI Code Rescue Service
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight max-w-4xl mx-auto">
          Your AI-Generated Code
          <br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Doesn't Have to Stay Broken
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
          Paste your broken AI-generated project. Our agent digs in, fixes it, and delivers it
          deployed and working — or you don't pay the balance.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#pricing"
            className="bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition flex items-center gap-2"
          >
            See Pricing <ArrowRight className="w-5 h-5" />
          </a>
          <a
            href="#how"
            className="text-gray-400 hover:text-white transition text-lg flex items-center gap-2"
          >
            How it works →
          </a>
        </div>
        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-12 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-green-400" /> Risk-free guarantee</span>
          <span className="hidden sm:flex items-center gap-1.5"><Check className="w-4 h-4 text-blue-400" /> Pay balance on delivery</span>
          <span className="hidden md:flex items-center gap-1.5"><Zap className="w-4 h-4 text-yellow-400" /> Stripe-secured payments</span>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="px-6 md:px-8 py-20 max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
          Three simple steps from broken code to live deployment.
        </p>
        <div className="space-y-10">
          {HOW_STEPS.map((step, i) => (
            <div key={i} className="flex gap-6 md:gap-10 items-start">
              <div className="text-5xl md:text-6xl font-extrabold text-blue-500/25 leading-none flex-shrink-0 w-16 text-right">
                {step.num}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {step.icon}
                  <h3 className="text-xl md:text-2xl font-bold">{step.title}</h3>
                </div>
                <p className="text-gray-400 text-lg">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Guarantee Banner */}
      <section className="px-6 md:px-8 py-6 max-w-4xl mx-auto">
        <div className="bg-blue-900/25 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-blue-300 font-semibold mb-1">Our Risk-Free Guarantee</h4>
              <p className="text-blue-200/70 text-sm leading-relaxed">
                You pay an upfront fee today. The balance is only charged if our agent successfully
                delivers your code — deployed and working within 7 days. If it's not fixed, you
                keep your upfront fee refunded, no questions asked.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-6 md:px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">Simple, Fair Pricing</h2>
        <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
          Upfront fee + balance only on successful delivery. No risk to you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {TIERS.map((tier) => (
            <div
              key={tier.key}
              onMouseEnter={() => setHovered(tier.key)}
              onMouseLeave={() => setHovered(null)}
              className={`relative flex flex-col rounded-2xl p-7 transition-all duration-200 ${
                tier.highlighted
                  ? "bg-gradient-to-b from-blue-500/20 to-white/5 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10"
                  : "bg-white/5 border border-white/10 hover:border-white/20"
              }`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                  MOST POPULAR
                </div>
              )}

              <h3 className="text-2xl font-bold mb-1">{tier.name}</h3>
              <p className="text-gray-400 text-sm mb-6">{tier.tagline}</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-extrabold">{tier.upfront}</span>
                  <span className="text-gray-500">today</span>
                </div>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-lg font-bold text-blue-400">+{tier.balance}</span>
                  <span className="text-gray-500 text-sm">on successful delivery</span>
                </div>
                <div className="text-gray-500 text-sm">Total if delivered: {tier.total}</div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={tier.upfrontLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full py-3 rounded-xl font-bold text-center transition flex items-center justify-center gap-2 ${
                  tier.highlighted
                    ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-black hover:opacity-90"
                    : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                }`}
              >
                {tier.cta} <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>

        <p className="text-center text-gray-500 text-sm mt-10">
          Need a custom plan or have questions?{" "}
          <a href="mailto:support@codeexpertagent.com" className="text-blue-400 hover:text-blue-300">
            Contact us
          </a>
        </p>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-8 py-12 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/images/logo.png" alt="Code Expert Agent" className="h-7 w-7 object-contain" />
            <span className="text-gray-400 text-sm">© 2025 Code Expert Agent. All prices in USD.</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/login" className="hover:text-white transition">Login</Link>
            <Link to="/signup" className="hover:text-white transition">Get Started</Link>
            <a href="mailto:support@codeexpertagent.com" className="hover:text-white transition">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
