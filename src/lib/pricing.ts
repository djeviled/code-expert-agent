export interface PricingTier {
  id: string;
  name: string;
  tier: number;
  price: { upfront: string; onDelivery: string; total: string };
  description: string;
  features: string[];
  /** Stripe Price ID for the upfront payment */
  priceId: string;
  highlighted?: boolean;
  credits: number;
}

/**
 * Stripe Price IDs (live mode — verified from Stripe dashboard)
 * Upfront prices charged at checkout.
 * Balance prices charged on successful delivery.
 */
export const STRIPE_PRICES = {
  // Upfront
  SITE_UPFRONT: "price_1TQt0SGusAHZYXWWXcinZvDI",   // $49
  CODE_UPFRONT: "price_1TQt0TGusAHZYXWWEr2O0ZHT",   // $79
  BUNDLE_UPFRONT: "price_1TQt0TGusAHZYXWWMmN7kv19", // $79
  // Balance (charged after successful delivery)
  SITE_BALANCE: "price_1TQt0aGusAHZYXWWVlliF9Qd",   // $99
  CODE_BALANCE: "price_1TQt0aGusAHZYXWWaopyNgvy",   // $149
  BUNDLE_BALANCE: "price_1TQt0aGusAHZYXWWxEwTktKL", // $149
} as const;

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "tier1",
    name: "SITE Rescue",
    tier: 1,
    price: { upfront: "$49", onDelivery: "$99", total: "$148" },
    description: "Your AI-generated site, broken and stalled? We fix it and deploy it live.",
    features: [
      "Agent analyzes your broken site code",
      "Fixes errors and dependency issues",
      "Deploys successfully to Vercel",
      "Code delivered error-free",
    ],
    priceId: STRIPE_PRICES.SITE_UPFRONT,
    credits: 1,
  },
  {
    id: "tier2",
    name: "CODE Rescue",
    tier: 2,
    price: { upfront: "$79", onDelivery: "$149", total: "$228" },
    description: "Your code almost works — but won't compile? We dig in and fix it.",
    features: [
      "Agent digs into your broken AI code",
      "Fixes syntax, logic, and integration errors",
      "Zero errors guaranteed",
      "Code review report included",
      "Code delivered clean and error-free",
    ],
    priceId: STRIPE_PRICES.CODE_UPFRONT,
    credits: 2,
    highlighted: true,
  },
  {
    id: "bundle",
    name: "Bundle — Site + Code",
    tier: 3,
    price: { upfront: "$79", onDelivery: "$149", total: "$228" },
    description: "Site + Code rescued together. Perfect for full-stack projects.",
    features: [
      "Agent fixes your site AND code together",
      "Full deployment to Vercel",
      "Everything delivered error-free",
      "Priority support",
    ],
    priceId: STRIPE_PRICES.BUNDLE_UPFRONT,
    credits: 2,
  },
];
