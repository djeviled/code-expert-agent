import type { PricingTier } from "../lib/pricing";
import { Check, Flame } from "lucide-react";
import { INTRO_OFFER } from "../lib/pricing";

interface PricingCardProps {
  tier: PricingTier;
}

// Normal prices for strikethrough display
const NORMAL_PRICES: Record<string, string> = {
  tier1: "$148",
  tier2: "$228",
  bundle: "$299",
};

const SAVINGS: Record<string, string> = {
  tier1: "Save $99",
  tier2: "Save $149",
  bundle: "Save $180",
};

export default function PricingCard({ tier }: PricingCardProps) {
  const isBundle = tier.id === "bundle";
  const normalPrice = NORMAL_PRICES[tier.id];
  const savings = SAVINGS[tier.id];

  return (
    <div
      className={`relative rounded-2xl p-8 border ${
        isBundle
          ? "border-orange-500/60 bg-gradient-to-b from-orange-500/15 to-white/5 shadow-xl shadow-orange-500/15"
          : tier.highlighted
          ? "border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-500/20"
          : "border-white/10 bg-white/5"
      }`}
    >
      {/* Badge */}
      {isBundle && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
          🔥 BEST DEAL — {savings}
        </div>
      )}
      {!isBundle && tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-400 text-black text-xs font-bold px-4 py-1 rounded-full">
          MOST POPULAR
        </div>
      )}

      <div className="text-sm font-medium text-blue-400 mb-2 mt-2">Tier {tier.tier}</div>
      <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
      <p className="text-gray-400 text-sm mb-5">{tier.description}</p>

      {/* Intro offer price block */}
      {INTRO_OFFER.active && (
        <div className="mb-6">
          {/* Strikethrough normal price */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-gray-500 text-sm line-through">{normalPrice} normally</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              isBundle ? "bg-orange-500/20 text-orange-400" : "bg-green-500/20 text-green-400"
            }`}>{savings}</span>
          </div>
          {/* Big intro price */}
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-5xl font-black ${isBundle ? "text-orange-400" : "text-white"}`}>
              {tier.price.upfront}
            </span>
            <span className="text-gray-400 text-sm">one-time</span>
          </div>
          {/* No balance badge */}
          <div className="inline-flex items-center gap-1.5 bg-green-500/15 border border-green-500/30 text-green-400 text-xs font-bold px-3 py-1 rounded-full">
            <Check className="w-3 h-3" />
            No balance due on delivery
          </div>
          {/* Intro label */}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-400/80">
            <Flame className="w-3 h-3" />
            Introductory launch price — one time only
          </div>
        </div>
      )}

      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, i) => (
          <li key={i} className={`flex items-center gap-3 text-sm ${
            feature.startsWith("✦") ? "text-green-400 font-semibold" : "text-gray-300"
          }`}>
            <Check className={`w-4 h-4 flex-shrink-0 ${isBundle ? "text-orange-400" : "text-blue-400"}`} />
            <span>{feature.replace("✦ ", "")}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          window.location.href = `/signup?tier=${tier.id}`;
        }}
        className={`w-full py-3.5 rounded-xl font-black transition-all text-sm ${
          isBundle
            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90 shadow-lg shadow-orange-500/30"
            : tier.highlighted
            ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-black hover:opacity-90"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        Claim {tier.name}
      </button>

      <p className="text-center text-gray-600 text-xs mt-4">
        Introductory offer — full service, flat fee, no surprises.
      </p>
    </div>
  );
}