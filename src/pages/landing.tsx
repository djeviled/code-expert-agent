import { useState } from "react";
import PricingCard from "../components/pricing-card";
import { PRICING_TIERS } from "../lib/pricing";
import { Check, Zap, Shield, Clock, Star } from "lucide-react";

const FEATURES = [
  {
    icon: "🔍",
    title: "Deep Code Analysis",
    description: "We dig into your entire codebase, identify what's broken, and map a clear path to a working solution.",
  },
  {
    icon: "🔧",
    title: "Full Debugging & Fixes",
    description: "Syntax errors, dependency conflicts, broken APIs, integration issues — we fix it all.",
  },
  {
    icon: "🚀",
    title: "Deploy to Vercel",
    description: "Your code goes live on Vercel, ready to run. No more dead-ended projects.",
  },
  {
    icon: "💳",
    title: "Pay Only on Success",
    description: "Small upfront fee. The rest when your site is live and working. We put skin in the game.",
  },
  {
    icon: "⚡",
    title: "Fast Turnaround",
    description: "We work efficiently — your project gets back on track without endless back-and-forth.",
  },
  {
    icon: "🛡️",
    title: "Money-Back Guarantee",
    description: "Can't fix it? Full refund on the upfront fee. No risk to you.",
  },
];

const PROCESS_STEPS = [
  {
    number: "01",
    title: "Choose Your Plan",
    description: "Select the tier that fits your project. Pay a small upfront commitment.",
  },
  {
    number: "02",
    title: "Submit Your Code",
    description: "Share your broken AI-generated project with us. We'll assess and confirm we can help.",
  },
  {
    number: "03",
    title: "We Fix It",
    description: "Our AI agent analyzes, debugs, and rebuilds your project until it's fully functional.",
  },
  {
    number: "04",
    title: "Site Goes Live",
    description: "Deployed on Vercel, error-free. You pay the balance on delivery. Only then.",
  },
];

export default function LandingPage() {
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const displayedFeatures = showAllFeatures ? FEATURES : FEATURES.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img src="/images/logo.png" alt="Code Expert Agent" className="h-10 w-10 object-contain" />
          <div>
            <span className="text-xl font-bold">Code Expert Agent</span>
            <span className="block text-xs text-gray-400">AI-Powered Code Rescue</span>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <a href="#features" className="text-gray-400 hover:text-white transition">Features</a>
          <a href="#process" className="text-gray-400 hover:text-white transition">How It Works</a>
          <a href="#pricing" className="text-gray-400 hover:text-white transition">Pricing</a>
          <a href="/chat" className="bg-blue-500 hover:bg-blue-400 text-black font-bold px-5 py-2 rounded-lg transition">
            Start Chat
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="text-center px-8 py-24 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-400 text-sm font-medium px-4 py-2 rounded-full mb-8 border border-blue-500/30">
          <Zap className="w-4 h-4" />
          AI-Powered Code Rescue
        </div>
        <h1 className="text-5xl font-extrabold mb-6 leading-tight">
          Your AI-Generated Code<br />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Doesn't Have to Stay Broken
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
          We take dead-ended AI-generated projects and get them fully operational. 
          Pay only when your site is live and working.
        </p>

        <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 mb-12">
          <Shield className="w-6 h-6 text-green-400" />
          <span className="text-gray-300">We put skin in the game — <strong className="text-white">only get paid when you succeed.</strong></span>
        </div>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="#pricing" className="bg-gradient-to-r from-blue-500 to-cyan-400 text-black font-bold px-8 py-4 rounded-xl text-lg hover:opacity-90 transition">
            Rescue My Code
          </a>
          <a href="/chat" className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-xl text-lg transition border border-white/20">
            Chat with Agent
          </a>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="px-8 py-24 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-4">Everything You Need to Ship</h2>
        <p className="text-gray-400 text-center mb-16">We handle the messy parts so you don't have to.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedFeatures.map((feature, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition">
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
        {FEATURES.length > 4 && (
          <div className="text-center mt-8">
            <button
              onClick={() => setShowAllFeatures(!showAllFeatures)}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              {showAllFeatures ? "Show less" : "Show all features"}
            </button>
          </div>
        )}
      </section>

      {/* How It Works */}
      <section id="process" className="px-8 py-24 bg-gradient-to-b from-transparent to-blue-950/20">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-gray-400 text-center mb-16">Simple, transparent, risk-free.</p>
          <div className="space-y-8">
            {PROCESS_STEPS.map((step, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="text-5xl font-extrabold text-blue-500/30 flex-shrink-0 w-16">{step.number}</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-gray-400">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-8 py-24">
        <h2 className="text-4xl font-bold text-center mb-4">Choose Your Rescue Plan</h2>
        <p className="text-gray-400 text-center mb-4 max-w-xl mx-auto">
          Small upfront fee. Balance due only when your site is live and working.
        </p>
        <div className="flex items-center justify-center gap-2 mb-12">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm">We work fast — most rescues completed within 48 hours</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tier, i) => (
            <PricingCard key={i} tier={tier} />
          ))}
        </div>

        <div className="flex items-center justify-center gap-4 mt-12 bg-green-500/10 border border-green-500/30 rounded-xl p-4 max-w-xl mx-auto">
          <Shield className="w-5 h-5 text-green-400" />
          <span className="text-green-400 text-sm font-medium">Money-back guarantee on upfront fee if we can't fix it.</span>
        </div>
      </section>

      {/* Social Proof / Trust */}
      <section className="px-8 py-16 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-400 mb-8">Trusted by developers who've been stuck with broken AI code</p>
          <div className="flex items-center justify-center gap-8">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              ))}
              <span className="text-gray-400 text-sm ml-2">5.0 rating</span>
            </div>
            <div className="text-gray-500">|</div>
            <div className="text-gray-400 text-sm">100% satisfaction</div>
            <div className="text-gray-500">|</div>
            <div className="text-gray-400 text-sm">Fast turnaround</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-12 border-t border-white/10 text-center text-gray-500">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src="/images/logo.png" alt="Code Expert Agent" className="h-8 w-8 object-contain" />
          <span className="font-bold text-white">Code Expert Agent</span>
        </div>
        <p className="text-sm">© 2025 Code Expert Agent. Built with 🧠 by developers, for developers.</p>
        <div className="flex items-center justify-center gap-6 mt-4">
          <a href="#" className="text-gray-500 hover:text-gray-400 text-sm">Terms</a>
          <a href="#" className="text-gray-500 hover:text-gray-400 text-sm">Privacy</a>
          <a href="#" className="text-gray-500 hover:text-gray-400 text-sm">Contact</a>
        </div>
      </footer>
    </div>
  );
}