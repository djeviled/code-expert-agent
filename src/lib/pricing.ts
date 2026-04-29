export const STRIPE_PRICES = {
  // Upfront (one-time per project)
  SITE_UPFRONT:    "price_1TQt0SGusAHZYXWWXcinZvDI",   // $49
  CODE_UPFRONT:    "price_1TQt0TGusAHZYXWWEr2O0ZHT",   // $79
  BUNDLE_UPFRONT:  "price_1TQt0TGusAHZYXWWMmN7kv19",   // $79
  // Balance (charged after successful delivery)
  SITE_BALANCE:    "price_1TQt0aGusAHZYXWWVlliF9Qd",   // $99
  CODE_BALANCE:    "price_1TQt0aGusAHZYXWWaopyNgvy",   // $149
  BUNDLE_BALANCE:  "price_1TQt0aGusAHZYXWWxEwTktKL",   // $149
  // Monthly subscription (recurring)
  MONTHLY_SINGLE:  "price_1TROyNGusAHZYXWWOumjFrV7",   // $49/mo — one project
  MONTHLY_PRIORITY:"price_1TROyNGusAHZYXWWQsSE8sGn",   // $99/mo — priority + multi
} as const;

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
    name: "SITE Rescue",
    tier: 1,
    price: { upfront: "$49", onDelivery: "$99", total: "$148" },
    description: "Your AI-generated site, broken and stalled? We fix it and deploy it live.",
    features: [
      "Agent analyzes your broken site code",
      "Fixes errors and dependency issues",
      "Deploys to Vercel — live URL delivered",
      "One project / one repository",
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
      "One project / one repository",
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
      "One project / one repository",
      "Priority support",
    ],
    priceId: STRIPE_PRICES.BUNDLE_UPFRONT,
    credits: 2,
  },
];

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  priceId: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "monthly_single",
    name: "Maintenance",
    price: "$49/mo",
    priceId: STRIPE_PRICES.MONTHLY_SINGLE,
    description: "Ongoing AI assistance for one deployed project.",
    features: [
      "Continuous bug fixes & improvements",
      "Feature additions on request",
      "Performance optimizations",
      "One project covered",
      "Cancel anytime",
    ],
  },
  {
    id: "monthly_priority",
    name: "Priority Maintenance",
    price: "$99/mo",
    priceId: STRIPE_PRICES.MONTHLY_PRIORITY,
    description: "Priority support + multiple projects covered.",
    features: [
      "Everything in Maintenance",
      "Up to 3 projects covered",
      "Priority response time",
      "Proactive monitoring",
      "Cancel anytime",
    ],
    highlighted: true,
  },
];
