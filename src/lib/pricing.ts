export interface PricingTier {
  id: string;
  name: string;
  tier: number;
  price: { upfront: string; onDelivery: string; total: string };
  description: string;
  features: string[];
  priceId: string;
  highlighted?: boolean;
  credits: number;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "tier1",
    name: "Site Live on Vercel",
    tier: 1,
    price: { upfront: "$49", onDelivery: "$150", total: "$199" },
    description: "Your site is deployed and running on Vercel, ready to go live.",
    features: [
      "Full code analysis",
      "Debug & fix errors",
      "Deploy to Vercel",
      "Code delivered error-free",
    ],
    priceId: "price_1TQoyrHAbyd0XocLT0otp7oQ",
    credits: 1,
  },
  {
    id: "tier2",
    name: "Code Without Errors (Premium)",
    tier: 2,
    price: { upfront: "$79", onDelivery: "$220", total: "$299" },
    description: "Everything in Tier 1 plus premium polish — zero errors, fully optimized.",
    features: [
      "Everything in Tier 1",
      "Premium code polish",
      "Zero errors guaranteed",
      "Performance optimization",
      "Code review report",
    ],
    priceId: "price_1TQoyrHAbyd0XocLTijLTgc5",
    credits: 2,
    highlighted: true,
  },
  {
    id: "bundle",
    name: "Bundle — 2 Sites",
    tier: 3,
    price: { upfront: "$79", onDelivery: "$250", total: "$329" },
    description: "Rescue 2 sites at once. Perfect for developers with multiple projects.",
    features: [
      "2 sites rescued",
      "Full code analysis",
      "Debug & fix errors",
      "Deploy to Vercel",
      "Priority support",
    ],
    priceId: "price_1TQoyrHAbyd0XocLSAFeYM7n",
    credits: 2,
  },
];