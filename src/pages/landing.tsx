import { Link } from "react-router-dom";
import { Check, ArrowRight, Zap, Shield, Clock, Star, RefreshCw } from "lucide-react";

const TIERS = [
  {
    key: "tier1",
    name: "SITE Rescue",
    tagline: "Your AI-generated site, broken and stalled?",
    upfront: "$49",
    balance: "$99",
    total: "$148",
    features: [
      "Fixes your broken site code",
      "Resolves errors & dependency issues",
      "Live deployment to Vercel",
      "Covers ONE project / repository",
    ],
    cta: "Start Site Rescue",
  },
  {
    key: "tier2",
    name: "CODE Rescue",
    tagline: "Your code almost works — but won't compile?",
    upfront: "$79",
    balance: "$149",
    total: "$228",
    features: [
      "Fixes syntax, logic & integration errors",
      "Zero build errors guaranteed",
      "Full code review report",
      "Covers ONE project / repository",
    ],
    cta: "Start Code Rescue",
    highlighted: true,
  },
  {
    key: "bundle",
    name: "Full-Stack Bundle",
    tagline: "Site + Code — everything rescued together",
    upfront: "$79",
    balance: "$149",
    total: "$228",
    features: [
      "Fixes site AND code together",
      "Full deployment to Vercel",
      "Everything error-free",
      "Covers ONE project / repository",
    ],
    cta: "Start Bundle Rescue",
  },
];

const SUBSCRIPTION_PLANS = [
  {
    name: "Maintenance",
    price: "$49",
    period: "/month",
    desc: "Keep one deployed project improving.",
    features: [
      "Ongoing bug fixes & improvements",
      "Feature additions on request",
      "Performance optimizations",
      "One project covered",
    ],
    cta: "Add After Rescue",
    priceKey: "monthly_single",
  },
  {
    name: "Priority Maintenance",
    price: "$99",
    period: "/month",
    desc: "Priority support + up to 3 projects.",
    features: [
      "Everything in Maintenance",
      "Up to 3 projects covered",
      "Priority response time",
      "Proactive monitoring",
    ],
    cta: "Add After Rescue",
    priceKey: "monthly_priority",
    highlighted: true,
  },
];

const HOW_STEPS = [
  {
    num: "01",
    icon: <Zap className="w-6 h-6 text-blue-400" />,
    title: "Describe the Problem",
    desc: "Paste your code, share errors, or link a GitHub repo. Tell us what's broken.",
  },
  {
    num: "02",
    icon: <Clock className="w-6 h-6 text-cyan-400" />,
    title: "Agent Goes to Work",
    desc: "Our AI engineer digs in, finds root causes, and systematically fixes every issue.",
  },
  {
    num: "03",
    icon: <Check className="w-6 h-6 text-green-400" />,
    title: "You Get a Live URL",
    desc: "Deployed to Vercel. Working code. You pay the balance — and keep the site.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-white/10 sticky top-0 bg-[#0a0a1a]/95 backdrop-blur-sm z-40">
        <div className="flex items-center gap-3">
          <img src="/images/logo.png" alt="Code Expert Agent" className="h-9 w-9 object-contain" />
          <span className="text-lg font-bold">Code Expert Agent</span>
        </div>
        <div className="flex items-center gap-4 md:gap-6">
          <a href="#how" className="hidden md:block text-gray-400 hover:text-white transition text-sm">How It Works</a>
          <a href="#pricing" className="hidden md:block text-gray-400 hover:text-white transition text-sm">Pricing</a>
          <a href="#maintenance" className="hidden md:block text-gray-400 hover:text-white transition text-sm">Monthly Plans</a>
          <Link to="/login" className="text-gray-400 hover:text-white transition text-sm">Login</Link>
          <Link to="/signup" className="bg-blue-500 hover:bg-blue-400 text-black font-bold px-4 py-2 rounded-lg transition text-sm">
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
          <a href="#pricing" className="bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition flex items-center gap-2">
            See Pricing <ArrowRight className="w-5 h-5" />
          </a>
          <a href="#how" className="text-gray-400 hover:text-white transition text-lg flex items-center gap-2">
            How it works →
          </a>
        </div>
        <div className="flex items-center justify-center gap-6 mt-12 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-green-400" /> Risk-free guarantee</span>
          <span className="hidden sm:flex items-center gap-1.5"><Check className="w-4 h-4 text-blue-400" /> Pay balance on delivery</span>
          <span className="hidden md:flex items-center gap-1.5"><RefreshCw className="w-4 h-4 text-yellow-400" /> Monthly maintenance available</span>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="px-6 md:px-8 py-20 max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
          Three steps from broken code to live deployment.
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

      {/* Important Clarity Banner */}
      <section className="px-6 md:px-8 py-4 max-w-4xl mx-auto">
        <div className="bg-[#111827] border border-blue-500/20 rounded-2xl p-6 grid sm:grid-cols-3 gap-6 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Check className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">One Fee = One Project</p>
              <p className="text-gray-400">Each payment covers one app or GitHub repository. Additional projects require a new fee.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Shield className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Risk-Free Guarantee</p>
              <p className="text-gray-400">You only pay the balance if we successfully deploy your working project. If we can't, you get refunded.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <RefreshCw className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <p className="font-semibold text-white mb-1">Want Ongoing Help?</p>
              <p className="text-gray-400">Add a monthly maintenance plan after your rescue to keep improving and expanding your project.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Rescue Pricing */}
      <section id="pricing" className="px-6 md:px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-2">Rescue Plans</h2>
        <p className="text-gray-400 text-center mb-4 max-w-xl mx-auto">
          One-time fee per project. Pay upfront + balance only on successful delivery.
        </p>
        <p className="text-center text-blue-400/80 text-sm mb-12 flex items-center justify-center gap-2">
          <Zap className="w-4 h-4" />
          Each plan covers exactly <strong className="text-white">one project / one repository</strong>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {TIERS.map((tier) => (
            <div key={tier.key} className={`relative flex flex-col rounded-2xl p-7 transition-all duration-200 ${
              tier.highlighted
                ? "bg-gradient-to-b from-blue-500/20 to-white/5 border-2 border-blue-500/50 shadow-lg shadow-blue-500/10"
                : "bg-white/5 border border-white/10 hover:border-white/20"
            }`}>
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
              <Link to={`/signup?tier=${tier.key}`} className={`w-full py-3 rounded-xl font-bold text-center transition flex items-center justify-center gap-2 ${
                tier.highlighted
                  ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-black hover:opacity-90"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}>
                {tier.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Monthly Maintenance */}
      <section id="maintenance" className="px-6 md:px-8 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-yellow-500/15 text-yellow-400 text-sm font-medium px-4 py-2 rounded-full mb-6 border border-yellow-500/30">
            <Star className="w-4 h-4" />
            Optional Add-On
          </div>
          <h2 className="text-4xl font-bold mb-4">Monthly Maintenance Plans</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Once your project is live, keep it growing. Our agent continues working on it every month —
            new features, bug fixes, performance improvements, and more.
            <strong className="text-white"> Cancel anytime.</strong>
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div key={plan.name} className={`relative flex flex-col rounded-2xl p-7 ${
              plan.highlighted
                ? "bg-gradient-to-b from-yellow-500/10 to-white/5 border-2 border-yellow-500/30"
                : "bg-white/5 border border-white/10"
            }`}>
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                  BEST VALUE
                </div>
              )}
              <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-extrabold">{plan.price}</span>
                <span className="text-gray-400">{plan.period}</span>
              </div>
              <p className="text-gray-400 text-sm mb-5">{plan.desc}</p>
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link to="/signup" className={`w-full py-3 rounded-xl font-bold text-center transition flex items-center justify-center gap-2 text-sm ${
                plan.highlighted
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
              }`}>
                {plan.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-gray-500 text-sm mt-6">
          Monthly plans are available after your first project is rescued and deployed.
        </p>
      </section>

      {/* Guarantee */}
      <section className="px-6 md:px-8 pb-12 max-w-4xl mx-auto">
        <div className="bg-blue-900/25 border border-blue-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-blue-300 font-semibold mb-1">Our Risk-Free Guarantee</h4>
              <p className="text-blue-200/70 text-sm leading-relaxed">
                You pay an upfront fee today. The balance is only charged if our agent successfully delivers your code —
                deployed and working within 7 days. If it's not fixed, you get your upfront fee refunded, no questions asked.
                Every project is scoped to one repository. Additional projects each require their own rescue plan.
              </p>
            </div>
          </div>
        </div>
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
            <a href="#maintenance" className="hover:text-white transition">Monthly Plans</a>
            <a href="mailto:support@codeexpertagent.com" className="hover:text-white transition">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
