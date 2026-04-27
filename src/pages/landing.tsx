import { useState } from "react";

const UPFRONT_LINKS = {
  site: "https://buy.stripe.com/fZu3cv2NLdht7Yt1CVcV200",
  code: "https://buy.stripe.com/fZu28rdsp3GT92xbdvcV201",
  bundle: "https://buy.stripe.com/00w00j5ZX4KX0w1dlDcV202",
};

const BALANCE_LINKS = {
  site: "https://buy.stripe.com/dRm6oHagd2CPfqV4P7cV203",
  code: "https://buy.stripe.com/3cIaEX741a5h4Mha9rcV204",
  bundle: "https://buy.stripe.com/00weVdbkhcdp6UpbdvcV205",
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
      "Agent fixes errors and dependency issues",
      "Agent deploys successfully to Vercel",
      "Code delivered error-free",
    ],
    cta: "Start Site Rescue",
    upfrontLink: UPFRONT_LINKS.site,
    balanceLink: BALANCE_LINKS.site,
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
      "Agent fixes syntax, logic, and integration errors",
      "Code delivered clean and error-free",
    ],
    cta: "Start Code Rescue",
    upfrontLink: UPFRONT_LINKS.code,
    balanceLink: BALANCE_LINKS.code,
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
    ],
    cta: "Start Bundle Rescue",
    upfrontLink: UPFRONT_LINKS.bundle,
    balanceLink: BALANCE_LINKS.bundle,
  },
];

export default function LandingPage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/images/logo.png" alt="Code Expert Agent" className="h-10 w-10 object-contain" />
          <span className="text-xl font-bold">Code Expert Agent</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#how" className="text-gray-400 hover:text-white transition">How It Works</a>
          <a href="#pricing" className="text-gray-400 hover:text-white transition">Pricing</a>
          <a href="/login" className="text-gray-400 hover:text-white transition">Login</a>
          <a href="/signup" className="bg-blue-500 hover:bg-blue-400 text-black font-bold px-5 py-2 rounded-lg transition">
            Get Started
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-8 py-28">
        <div className="inline-block bg-blue-500/20 text-blue-400 text-sm font-medium px-4 py-2 rounded-full mb-8 border border-blue-500/30">
          AI Code Rescue Service
        </div>
        <h1 className="text-6xl font-extrabold mb-6 leading-tight">
          Your AI-Generated Code<br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Doesn't Have to Stay Broken
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
          Paste your broken AI-generated project. Our agent digs in, fixes it, and delivers it deployed and working — or you don't pay the balance.
        </p>
        <a href="#pricing" className="bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition">
          See Pricing
        </a>
      </section>

      {/* How It Works */}
      <section id="how" className="px-8 py-24 max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>
        <div className="space-y-12">
          {[
            {
              num: "01",
              title: "You Describe the Problem",
              desc: "Tell our agent what's broken — paste code, describe the error, share a GitHub link.",
            },
            {
              num: "02",
              title: "Agent Goes to Work",
              desc: "Our agent analyzes your code, finds the dead ends, and systematically fixes every issue.",
            },
            {
              num: "03",
              title: "Code Gets Deployed",
              desc: "Agent deploys your working application to Vercel. You get the live URL + clean code.",
            },
          ].map((step, i) => (
            <div key={i} className="flex gap-8 items-start">
              <div className="text-6xl font-extrabold text-blue-500/30">{step.num}</div>
              <div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400 text-lg">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Disclaimer Banner */}
      <section className="px-8 py-8 max-w-4xl mx-auto">
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-2xl p-6">
          <p className="text-blue-300 text-sm leading-relaxed">
            <strong>Here's how it works:</strong> You pay an upfront fee today. We hold a balance that only gets charged if our agent successfully delivers your code deployed and working. If your project is rescued within the first 7 days, the balance is charged and that's that. If not — you have 15 additional days to dispute. We check the deployment logs. If there was a successful deploy, the balance stands. Simple.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-8 py-24 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">Simple, Fair Pricing</h2>
        <p className="text-gray-400 text-center mb-16 max-w-xl mx-auto">
          Upfront fee + balance due only on successful delivery. No risk to you.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TIERS.map((tier) => (
            <div key={tier.key} className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col">
              <h3 className="text-2xl font-bold mb-1">{tier.name}</h3>
              <p className="text-gray-400 text-sm mb-6">{tier.tagline}</p>

              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-4xl font-extrabold text-white">{tier.upfront}</span>
                  <span className="text-gray-500">today</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-blue-400">{tier.balance}</span>
                  <span className="text-gray-500 text-sm">balance on success</span>
                </div>
                <div className="text-gray-500 text-sm mt-1">Total: {tier.total}</div>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-gray-300 text-sm">
                    <span className="text-blue-400 mt-0.5">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={tier.upfrontLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-xl font-bold text-center bg-gradient-to-r from-blue-500 to-cyan-400 text-black hover:opacity-90 transition"
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 border-t border-white/10 text-center text-gray-500 text-sm">
        <p>© 2025 Code Expert Agent. All prices in USD.</p>
      </footer>
    </div>
  );
}
