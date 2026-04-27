import type { PricingTier } from "../lib/pricing";
import { Check } from "lucide-react";
import { PRICING_TIERS } from "../lib/pricing";

interface PricingCardProps {
  tier: PricingTier;
}

export default function PricingCard({ tier }: PricingCardProps) {
  return (
    <div
      className={`relative rounded-2xl p-8 border ${
        tier.highlighted
          ? "border-blue-500 bg-blue-500/10 shadow-xl shadow-blue-500/20"
          : "border-white/10 bg-white/5"
      }`}
    >
      {tier.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-400 text-black text-xs font-bold px-4 py-1 rounded-full">
          MOST POPULAR
        </div>
      )}

      <div className="text-sm font-medium text-blue-400 mb-2">Tier {tier.tier}</div>
      <h3 className="text-2xl font-bold text-white mb-2">{tier.name}</h3>
      <p className="text-gray-400 text-sm mb-6">{tier.description}</p>

      <div className="mb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-extrabold text-white">{tier.price.upfront}</span>
          <span className="text-gray-400">upfront</span>
        </div>
        <div className="text-gray-500 text-sm mt-1">
          + {tier.price.onDelivery} on delivery
        </div>
        <div className="text-gray-600 text-sm mt-1">
          Total: {tier.price.total}
        </div>
      </div>

      <div className="bg-white/5 rounded-xl p-4 mb-6">
        <div className="text-xs text-gray-400 mb-2">Pay in two steps:</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 bg-blue-500 rounded-full" />
          <div className="text-xs text-gray-400">then</div>
          <div className="flex-1 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-blue-400">Pay now</span>
          <span className="text-gray-400">Balance on success</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {tier.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-3 text-gray-300 text-sm">
            <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          window.location.href = `/signup?tier=${tier.id}`;
        }}
        className={`w-full py-3 rounded-xl font-bold transition-all ${
          tier.highlighted
            ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-black hover:opacity-90"
            : "bg-white/10 text-white hover:bg-white/20"
        }`}
      >
        Start Rescue
      </button>

      <p className="text-center text-gray-600 text-xs mt-4">
        We only get paid when your site is live and working.
      </p>
    </div>
  );
}