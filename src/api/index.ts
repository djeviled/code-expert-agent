import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import Anthropic from "@anthropic-ai/sdk";

const app = new Hono();

app.use("/api/*", cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));

// ────────────────────────────────────────────────────────────
// Clients
// ────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "https://pbfkqyrplcdzbnetfwjm.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const STRIPE_SK = process.env.STRIPE_SECRET_KEY || "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || "";

function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getStripe() {
  return new Stripe(STRIPE_SK, { apiVersion: "2025-04-30.basil" as any });
}

function getAnthropic() {
  return new Anthropic({ apiKey: ANTHROPIC_KEY });
}

// ────────────────────────────────────────────────────────────
// AUTH — POST /api/auth/login
// ────────────────────────────────────────────────────────────
app.post("/api/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) return c.json({ error: "Email and password are required" }, 400);

    const supabase = supabaseAdmin();

    // Sign in via Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return c.json({ error: "Invalid email or password" }, 401);

    // Get user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", data.user.id)
      .single();

    const isAdmin = profile?.role === "ADMIN";

    return c.json({
      token: data.session?.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: profile?.name || data.user.user_metadata?.name || "",
        role: profile?.role || "SITE",
      },
      isAdmin,
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return c.json({ error: "Login failed" }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// AGENT — POST /api/agent/session
// Creates a session and returns greeting
// ────────────────────────────────────────────────────────────
app.post("/api/agent/session", async (c) => {
  try {
    const { userEmail } = await c.req.json();
    if (!userEmail) return c.json({ error: "userEmail required" }, 400);

    const supabase = supabaseAdmin();

    // Get user profile
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("email", userEmail)
      .single();

    // Create session record
    const { data: session, error } = await supabase
      .from("agent_sessions")
      .insert({
        user_id: user?.id || null,
        title: `Session for ${userEmail}`,
      })
      .select()
      .single();

    if (error || !session) {
      console.error("Session create error:", error);
      return c.json({ error: "Failed to create session" }, 500);
    }

    const userName = user?.name || userEmail.split("@")[0];
    const greeting =
      `Hi ${userName}! 👋 I'm your **Code Expert Agent** — I specialize in rescuing broken AI-generated code.\n\n` +
      `**To get started, tell me:**\n` +
      `1. What's broken or not working?\n` +
      `2. Paste your code, error messages, or share a GitHub link\n` +
      `3. What platform are you deploying to? (Vercel, Netlify, Railway, etc.)\n\n` +
      `I'll analyze everything systematically and fix it. No code left behind. 🚀`;

    // Store greeting as first message
    await supabase.from("agent_messages").insert({
      session_id: session.id,
      role: "agent",
      content: greeting,
    });

    return c.json({ sessionId: session.id, greeting });
  } catch (err: any) {
    console.error("Session error:", err);
    return c.json({ error: "Failed to start session" }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// AGENT — POST /api/agent/message
// Returns SSE stream with Claude's response
// ────────────────────────────────────────────────────────────
app.post("/api/agent/message", async (c) => {
  const { sessionId, message } = await c.req.json();
  if (!sessionId || !message) return c.json({ error: "sessionId and message required" }, 400);

  const supabase = supabaseAdmin();
  const anthropic = getAnthropic();

  // Store user message
  await supabase.from("agent_messages").insert({
    session_id: sessionId,
    role: "user",
    content: message,
  });

  // Get conversation history
  const { data: history } = await supabase
    .from("agent_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  // Build Claude messages (skip the initial greeting context message)
  const claudeMessages: { role: "user" | "assistant"; content: string }[] = (history || []).map(
    (m: any) => ({
      role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })
  );

  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!ANTHROPIC_KEY) {
          send({ type: "chunk", text: "⚠️ Agent is not configured yet. ANTHROPIC_API_KEY is missing. Please contact support." });
          send({ type: "done" });
          controller.close();
          return;
        }

        const claudeStream = anthropic.messages.stream({
          model: "claude-opus-4-5",
          max_tokens: 8096,
          system: `You are Code Expert Agent — an elite AI engineer specialized in rescuing broken AI-generated code.

Your expertise:
- TypeScript, JavaScript, React, Next.js, Vue, Python, Go
- Fixing build errors, dependency conflicts, and deployment failures  
- Debugging Supabase, PostgreSQL, MongoDB, Firebase integrations
- Stripe, OpenAI, Anthropic API integrations
- Deploying to Vercel, Netlify, Railway, Render, Fly.io
- Reading error logs and stack traces
- Fixing CSS/styling issues in Tailwind, Styled Components, CSS Modules

Your approach:
1. Ask clarifying questions if you need more context
2. Analyze code and errors systematically  
3. Identify the ROOT CAUSE — not just symptoms
4. Provide COMPLETE fixed code, not partial snippets
5. Explain what was wrong and why your fix works
6. Always check if there are related issues that could cause problems

Formatting:
- Use code blocks with language labels for all code
- Use **bold** for important points
- Keep explanations concise but thorough
- If asked for a full file, provide the COMPLETE file

You never give up. You dig deeper. You ship working code.`,
          messages: claudeMessages,
        });

        for await (const chunk of claudeStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const text = chunk.delta.text;
            fullResponse += text;
            send({ type: "chunk", text });
          }
        }

        // Save full response to DB
        await supabase.from("agent_messages").insert({
          session_id: sessionId,
          role: "agent",
          content: fullResponse,
        });

        send({ type: "done" });
        controller.close();
      } catch (err: any) {
        console.error("Claude stream error:", err);
        send({ type: "error", message: err.message || "Agent error occurred" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

// ────────────────────────────────────────────────────────────
// STRIPE — POST /api/stripe/checkout
// ────────────────────────────────────────────────────────────
app.post("/api/stripe/checkout", async (c) => {
  try {
    const { priceId, tier, userEmail, userName, projectDescription, projectUrl } =
      await c.req.json();

    if (!priceId || !userEmail) return c.json({ error: "Missing required fields" }, 400);

    const stripe = getStripe();
    const origin =
      c.req.header("origin") ||
      c.req.header("referer")?.replace(/\/$/, "") ||
      "https://code-expert-agent.vercel.app";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${origin}/signup?tier=${tier || "tier1"}`,
      customer_email: userEmail,
      metadata: {
        tier: tier || "tier1",
        userName: userName || "",
        projectDescription: (projectDescription || "").slice(0, 500),
        projectUrl: projectUrl || "",
      },
    });

    return c.json({ url: session.url });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return c.json({ error: err.message || "Failed to create checkout" }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// STRIPE — POST /api/stripe/webhook
// ────────────────────────────────────────────────────────────
app.post("/api/stripe/webhook", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return c.json({ error: `Webhook error: ${err.message}` }, 400);
  }

  const supabase = supabaseAdmin();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.CheckoutSession;
      const { tier, userName, projectDescription, projectUrl } = session.metadata || {};
      const email = session.customer_email || "";

      if (!email) {
        console.error("Webhook: no email in session");
        return c.json({ received: true });
      }

      // Find or create Supabase auth user
      let userId: string | undefined;
      const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const existing = listData?.users?.find((u) => u.email === email);

      if (existing) {
        userId = existing.id;
      } else {
        const { data: newUser, error: userErr } = await supabase.auth.admin.createUser({
          email,
          user_metadata: { name: userName || email.split("@")[0] },
          email_confirm: true,
        });
        if (userErr || !newUser?.user) {
          console.error("Failed to create user:", userErr);
        } else {
          userId = newUser.user.id;
        }
      }

      if (!userId) return c.json({ received: true });

      // Map tier to role
      const roleMap: Record<string, string> = { tier1: "SITE", tier2: "CODE", bundle: "BUNDLE" };
      const role = roleMap[tier || "tier1"] || "SITE";

      // Upsert user profile
      await supabase.from("users").upsert(
        { id: userId, email, name: userName || email.split("@")[0], role },
        { onConflict: "id" }
      );

      // Balance amounts per tier
      const balanceAmounts: Record<string, number> = {
        SITE: 9900,
        CODE: 14900,
        BUNDLE: 14900,
      };

      // Create project
      await supabase.from("projects").insert({
        user_id: userId,
        tier: role,
        upfront_amount: session.amount_total || 0,
        balance_amount: balanceAmounts[role] || 9900,
        upfront_payment_id: (session.payment_intent as string) || "",
        description: projectDescription || "",
        github_repo: projectUrl || "",
        status: "pending",
      });

      // Send magic link so customer can set password & log in
      try {
        await supabase.auth.admin.generateLink({ type: "magiclink", email });
      } catch (linkErr) {
        console.error("Magic link error (non-fatal):", linkErr);
      }
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.CheckoutSession;
      // Handle balance payment completion
      if (session.metadata?.type === "balance" && session.metadata?.orderId) {
        await supabase
          .from("projects")
          .update({ status: "delivered", balance_payment_id: session.payment_intent as string })
          .eq("id", session.metadata.orderId);
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }

  return c.json({ received: true });
});

// ────────────────────────────────────────────────────────────
// PAYMENTS — POST /api/payments/balance-checkout
// Customer-facing: create Stripe checkout for balance payment
// ────────────────────────────────────────────────────────────
app.post("/api/payments/balance-checkout", async (c) => {
  try {
    const { orderId, tier, email } = await c.req.json();
    if (!orderId || !tier || !email) return c.json({ error: "Missing fields" }, 400);

    const stripe = getStripe();
    const origin =
      c.req.header("origin") ||
      c.req.header("referer")?.replace(/\/$/, "") ||
      "https://code-expert-agent.vercel.app";

    const balancePriceIds: Record<string, string> = {
      tier1: process.env.STRIPE_SITE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWVlliF9Qd",
      tier2: process.env.STRIPE_CODE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWaopyNgvy",
      bundle: process.env.STRIPE_BUNDLE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWxEwTktKL",
      SITE: process.env.STRIPE_SITE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWVlliF9Qd",
      CODE: process.env.STRIPE_CODE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWaopyNgvy",
      BUNDLE: process.env.STRIPE_BUNDLE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWxEwTktKL",
    };

    const priceId = balancePriceIds[tier] || balancePriceIds.tier1;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/success?type=balance&order_id=${orderId}`,
      cancel_url: `${origin}/pay-balance?order_id=${orderId}&tier=${tier}&email=${encodeURIComponent(email)}`,
      customer_email: email,
      metadata: { type: "balance", orderId, tier },
    });

    return c.json({ url: session.url });
  } catch (err: any) {
    console.error("Balance checkout error:", err);
    return c.json({ error: err.message }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// ADMIN AUTH MIDDLEWARE
// ────────────────────────────────────────────────────────────
async function requireAdmin(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);

  const token = authHeader.slice(7);
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return c.json({ error: "Unauthorized" }, 401);

  const { data: profile } = await supabaseAdmin()
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "ADMIN") return c.json({ error: "Forbidden" }, 403);

  c.set("adminUser", user);
  await next();
}

// ────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/stats
// ────────────────────────────────────────────────────────────
app.get("/api/admin/stats", requireAdmin, async (c) => {
  const supabase = supabaseAdmin();

  const [usersRes, projectsRes] = await Promise.all([
    supabase.from("users").select("id, created_at", { count: "exact", head: false }),
    supabase.from("projects").select("id, status, upfront_amount, balance_amount, created_at", {
      count: "exact",
      head: false,
    }),
  ]);

  const projects = projectsRes.data || [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const totalRevenue = projects.reduce((s, p) => s + (p.upfront_amount || 0), 0);
  const monthRevenue = projects
    .filter((p) => new Date(p.created_at) >= monthStart)
    .reduce((s, p) => s + (p.upfront_amount || 0), 0);

  // Count active sessions in last 24h
  const { count: activeSessions } = await supabase
    .from("agent_sessions")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 86400000).toISOString());

  return c.json({
    total_users: usersRes.count || 0,
    active_users: usersRes.count || 0,
    total_orders: projectsRes.count || 0,
    pending_orders: projects.filter((p) => p.status === "pending").length,
    in_progress_orders: projects.filter((p) => p.status === "in_progress").length,
    total_revenue: totalRevenue,
    this_month_revenue: monthRevenue,
    active_sessions: activeSessions || 0,
  });
});

// ────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/users
// ────────────────────────────────────────────────────────────
app.get("/api/admin/users", requireAdmin, async (c) => {
  const supabase = supabaseAdmin();

  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, name, role, created_at, projects(id, status, upfront_amount)")
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ users: users || [] });
});

// ────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/orders
// ────────────────────────────────────────────────────────────
app.get("/api/admin/orders", requireAdmin, async (c) => {
  const supabase = supabaseAdmin();

  const { data: orders, error } = await supabase
    .from("projects")
    .select("*, users(email, name)")
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ orders: orders || [] });
});

// ────────────────────────────────────────────────────────────
// ADMIN — POST /api/admin/orders/:id/status
// Update order status
// ────────────────────────────────────────────────────────────
app.post("/api/admin/orders/:id/status", requireAdmin, async (c) => {
  const orderId = c.req.param("id");
  const { status } = await c.req.json();
  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("projects")
    .update({ status, ...(status === "delivered" ? { delivered_at: new Date().toISOString() } : {}) })
    .eq("id", orderId);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// ADMIN — POST /api/admin/orders/:id/deliver
// Mark delivered + create balance checkout
// ────────────────────────────────────────────────────────────
app.post("/api/admin/orders/:id/deliver", requireAdmin, async (c) => {
  const orderId = c.req.param("id");
  const supabase = supabaseAdmin();
  const stripe = getStripe();

  const { data: order, error: orderErr } = await supabase
    .from("projects")
    .select("*, users(email, name)")
    .eq("id", orderId)
    .single();

  if (orderErr || !order) return c.json({ error: "Order not found" }, 404);

  // Update status to awaiting payment
  await supabase
    .from("projects")
    .update({ status: "awaiting_payment", delivered_at: new Date().toISOString() })
    .eq("id", orderId);

  const origin =
    c.req.header("origin") ||
    "https://code-expert-agent.vercel.app";

  const balancePriceIds: Record<string, string> = {
    SITE: process.env.STRIPE_SITE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWVlliF9Qd",
    CODE: process.env.STRIPE_CODE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWaopyNgvy",
    BUNDLE: process.env.STRIPE_BUNDLE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWxEwTktKL",
  };

  const priceId = balancePriceIds[order.tier] || balancePriceIds.SITE;
  const customerEmail = (order.users as any)?.email || "";

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/success?type=balance&order_id=${orderId}`,
      cancel_url: `${origin}/pay-balance?order_id=${orderId}&tier=${order.tier}&email=${encodeURIComponent(customerEmail)}`,
      customer_email: customerEmail,
      metadata: { type: "balance", orderId, tier: order.tier },
    });

    // Send balance payment link to customer via email (would need email service)
    // For now, return the URL so admin can send it manually
    const balanceUrl = `${origin}/pay-balance?order_id=${orderId}&tier=${order.tier.toLowerCase()}&email=${encodeURIComponent(customerEmail)}`;

    return c.json({ success: true, checkoutUrl: session.url, balanceUrl });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// ADMIN — POST /api/admin/users/:id/credits
// ────────────────────────────────────────────────────────────
app.post("/api/admin/users/:id/credits", requireAdmin, async (c) => {
  const userId = c.req.param("id");
  const { action, amount } = await c.req.json();
  const supabase = supabaseAdmin();

  // Get current credits
  const { data: user } = await supabase
    .from("users")
    .select("credits")
    .eq("id", userId)
    .single();

  const current = (user as any)?.credits || 0;
  const next = action === "add" ? current + amount : Math.max(0, current - amount);

  const { error } = await supabase.from("users").update({ credits: next }).eq("id", userId);
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ success: true, credits: next });
});

// ────────────────────────────────────────────────────────────
// ADMIN — POST /api/admin/users/:id/freeze
// ────────────────────────────────────────────────────────────
app.post("/api/admin/users/:id/freeze", requireAdmin, async (c) => {
  const userId = c.req.param("id");
  const { frozen } = await c.req.json();
  const supabase = supabaseAdmin();

  if (frozen) {
    await supabase.auth.admin.updateUserById(userId, { ban_duration: "87600h" }); // ~10 years
  } else {
    await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
  }

  return c.json({ success: true });
});

export default app;
