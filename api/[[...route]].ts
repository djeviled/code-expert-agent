/**
 * Vercel serverless catch-all — ALL API logic is inlined here.
 * Single self-contained file: no local TS imports needed.
 * Supports SSE streaming, Stripe, Anthropic, Supabase.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return c.json({ error: "Invalid email or password" }, 401);

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
// AUTH — POST /api/auth/password-reset
// ────────────────────────────────────────────────────────────
app.post("/api/auth/password-reset", async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) return c.json({ error: "Email is required" }, 400);

    const supabase = supabaseAdmin();
    const origin =
      c.req.header("origin") ||
      c.req.header("referer")?.replace(/\/[^/]*$/, "") ||
      "https://codeexpertagent.com";

    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/reset-password`,
    });

    // Always return success — don't leak whether email exists
    return c.json({ message: "If an account exists with this email, a reset link will be sent shortly" });
  } catch (err) {
    console.error("Password reset error:", err);
    return c.json({ error: "Password reset failed" }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// AUTH — POST /api/auth/update-password
// ────────────────────────────────────────────────────────────
app.post("/api/auth/update-password", async (c) => {
  try {
    const { token, password } = await c.req.json();
    if (!token || !password) return c.json({ error: "Token and password are required" }, 400);
    if (password.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);

    const supabase = supabaseAdmin();

    // Verify the recovery token and get the user
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return c.json({ error: "Invalid or expired reset link. Please request a new one." }, 401);
    }

    // Update password via admin API (bypasses session requirement)
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.user.id,
      { password }
    );
    if (updateError) return c.json({ error: "Failed to update password. Please try again." }, 500);

    return c.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    return c.json({ error: "Failed to update password" }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// AGENT — POST /api/agent/session
// Creates an Anthropic managed session + stores in DB
// ────────────────────────────────────────────────────────────
app.post("/api/agent/session", async (c) => {
  try {
    const { userEmail } = await c.req.json();
    if (!userEmail) return c.json({ error: "userEmail required" }, 400);

    const supabase = supabaseAdmin();
    const anthropic = getAnthropic();

    const AGENT_ID       = process.env.AGENT_ID       || "";
    const ENVIRONMENT_ID = process.env.ENVIRONMENT_ID || "";
    const VAULT_ID       = process.env.VAULT_ID       || "";

    // Look up user profile
    const { data: user } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", userEmail)
      .single();

    const userName = user?.name || userEmail.split("@")[0];

    // Create Anthropic managed session with MCP tools
    let anthropicSessionId: string | null = null;
    if (AGENT_ID && ENVIRONMENT_ID && VAULT_ID) {
      try {
        const agentSession = await (anthropic as any).beta.sessions.create({
          agent: AGENT_ID,
          environment_id: ENVIRONMENT_ID,
          vault_ids: [VAULT_ID],
          title: `Session — ${userEmail}`,
        });
        anthropicSessionId = agentSession.id;
      } catch (agentErr: any) {
        console.error("Managed session create error (non-fatal):", agentErr.message);
        // Fall through to basic mode
      }
    }

    // Store session in Supabase (session_id = Anthropic session ID)
    const { data: session, error: sessionErr } = await supabase
      .from("agent_sessions")
      .insert({
        user_id: user?.id || null,
        session_id: anthropicSessionId || null,
        project_name: `Session for ${userEmail}`,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (sessionErr || !session) {
      console.error("DB session create error:", sessionErr);
      return c.json({ error: "Failed to create session" }, 500);
    }

    const greeting =
      `Hi ${userName}! 👋 I'm your **Code Expert Agent** — I have full access to GitHub, Vercel, and Supabase via MCP tools.\n\n` +
      `**To get started, tell me:**\n` +
      `1. What's broken or not working?\n` +
      `2. Paste your code, error messages, or share a GitHub repo link\n` +
      `3. What platform are you deploying to? (Vercel, Netlify, Railway, etc.)\n\n` +
      `I can read and write to your repos, deploy to Vercel, and manage your database directly. No code left behind. 🚀`;

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
// Routes to managed session (with MCP tools) or fallback
// Returns SSE: {type:"thinking"} | {type:"tool",server,tool} | {type:"chunk",text} | {type:"done"} | {type:"error",message}
// ────────────────────────────────────────────────────────────
app.post("/api/agent/message", async (c) => {
  const { sessionId, message } = await c.req.json();
  if (!sessionId || !message) return c.json({ error: "sessionId and message required" }, 400);

  const supabase = supabaseAdmin();
  const anthropic = getAnthropic();

  // Load DB session to get Anthropic session ID
  const { data: dbSession } = await supabase
    .from("agent_sessions")
    .select("id, session_id, user_id")
    .eq("id", sessionId)
    .single();

  const anthropicSessionId = dbSession?.session_id || null;

  // Save user message to DB
  await supabase.from("agent_messages").insert({
    session_id: sessionId,
    role: "user",
    content: message,
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // ── PATH A: Managed Agents (MCP tools via Anthropic sessions) ──
      if (anthropicSessionId) {
        try {
          send({ type: "thinking" });

          // Send user message to managed session
          await (anthropic as any).beta.sessions.events.send(anthropicSessionId, {
            events: [{
              type: "user.message",
              content: [{ type: "text", text: message }],
            }],
          });

          // Stream events back, translating to our SSE format
          const eventStream = await (anthropic as any).beta.sessions.events.stream(
            anthropicSessionId
          );

          for await (const event of eventStream) {
            const e = event as any;

            if (e.type === "session.status_running") {
              send({ type: "thinking" });

            } else if (e.type === "agent.thinking") {
              send({ type: "thinking" });

            } else if (e.type === "agent.mcp_tool_use") {
              // Show tool usage to user
              send({ type: "tool", server: e.mcp_server_name || "tool", tool: e.name || "" });

            } else if (e.type === "agent.tool_use") {
              send({ type: "tool", server: "agent", tool: e.name || "" });

            } else if (e.type === "agent.message") {
              // Stream the agent's text response
              for (const block of (e.content || [])) {
                if (block.type === "text" && block.text) {
                  fullResponse += block.text;
                  // Stream in small word-sized chunks for typewriter effect
                  const tokens = (block.text as string).match(/\S+\s*/g) || [block.text];
                  for (const token of tokens) {
                    send({ type: "chunk", text: token });
                  }
                }
              }

            } else if (e.type === "session.requires_action") {
              // Auto-approve tool confirmations (file writes, pushes)
              try {
                await (anthropic as any).beta.sessions.events.send(anthropicSessionId, {
                  events: [{
                    type: "user.tool_confirmation",
                    tool_use_id: e.tool_use_id,
                    confirmed: true,
                  }],
                });
              } catch (confirmErr: any) {
                console.error("Tool confirmation error:", confirmErr.message);
              }

            } else if (
              e.type === "session.status_idle" ||
              e.type === "session.end_turn"
            ) {
              break; // Done for this turn

            } else if (e.type === "session.error") {
              const errMsg = e.error?.message || "Agent error occurred";
              console.error("Session error event:", errMsg);
              send({ type: "error", message: errMsg });
              controller.close();
              return;
            }
            // Silently skip: agent.tool_result, agent.mcp_tool_result,
            //                span.*, session.status_rescheduled, session.deleted
          }

          // Save full response to DB
          if (fullResponse) {
            await supabase.from("agent_messages").insert({
              session_id: sessionId,
              role: "agent",
              content: fullResponse,
            });
          }

          send({ type: "done" });
          controller.close();
          return;

        } catch (err: any) {
          console.error("Managed session stream error, falling back:", err.message);
          // Fall through to direct Claude fallback
        }
      }

      // ── PATH B: Direct Claude fallback (no MCP tools) ──
      try {
        if (!ANTHROPIC_KEY) {
          send({ type: "chunk", text: "⚠️ Agent is not configured. ANTHROPIC_API_KEY missing." });
          send({ type: "done" });
          controller.close();
          return;
        }

        const { data: history } = await supabase
          .from("agent_messages")
          .select("role, content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: true });

        const claudeMessages: { role: "user" | "assistant"; content: string }[] =
          (history || []).map((m: any) => ({
            role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
            content: m.content,
          }));

        const claudeStream = anthropic.messages.stream({
          model: "claude-opus-4-5",
          max_tokens: 8096,
          system: `You are Code Expert Agent — an elite AI engineer specialized in rescuing broken AI-generated code.
Fix build errors, deployment failures, TypeScript, React, Supabase, Stripe, and Vercel issues.
Always provide complete fixed code. Identify root causes, not just symptoms.`,
          messages: claudeMessages,
        });

        for await (const chunk of claudeStream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            const text = chunk.delta.text;
            fullResponse += text;
            send({ type: "chunk", text });
          }
        }

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
      "https://codeexpertagent.com";

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

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature error:", err.message);
    return c.json({ error: `Webhook error: ${err.message}` }, 400);
  }

  const supabase = supabaseAdmin();

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const { tier, userName, projectDescription, projectUrl, type, orderId } =
        session.metadata || {};
      const email = session.customer_email || "";

      // ── Balance payment completion ──
      if (type === "balance" && orderId) {
        await supabase
          .from("projects")
          .update({
            status: "delivered",
            balance_payment_id: session.payment_intent as string,
          })
          .eq("id", orderId);
        return c.json({ received: true });
      }

      // ── New upfront payment / customer signup ──
      if (!email) {
        console.error("Webhook: no email in session");
        return c.json({ received: true });
      }

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

      const roleMap: Record<string, string> = { tier1: "SITE", tier2: "CODE", bundle: "BUNDLE" };
      const role = roleMap[tier || "tier1"] || "SITE";

      await supabase.from("users").upsert(
        { id: userId, email, name: userName || email.split("@")[0], role },
        { onConflict: "id" }
      );

      const balanceAmounts: Record<string, number> = {
        SITE: 9900,
        CODE: 14900,
        BUNDLE: 14900,
      };

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

      try {
        await supabase.auth.admin.generateLink({ type: "magiclink", email });
      } catch (linkErr) {
        console.error("Magic link error (non-fatal):", linkErr);
      }
    }

    // ── Subscription checkout completion → save customer ID + subscription ──
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      if (session.mode === "subscription" && session.metadata?.userId) {
        await supabase.from("users").update({
          stripe_customer_id: session.customer as string,
          subscription_status: "active",
          subscription_tier: session.metadata?.priceId?.includes("QsSE8sGn")
            ? "monthly_priority"
            : "monthly_single",
          stripe_subscription_id: session.subscription as string,
        }).eq("id", session.metadata.userId);
      }
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
  }

  // ── Subscription lifecycle ──
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as any;
    try {
      await supabaseAdmin().from("users").update({
        subscription_status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
        ...(event.type === "customer.subscription.deleted" ? { stripe_subscription_id: null } : {}),
      }).eq("stripe_customer_id", sub.customer);
    } catch (e) {
      console.error("Subscription webhook error:", e);
    }
  }

  // ── Invoice payment failed → log to admin_notes ──
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as any;
    try {
      const supabase = supabaseAdmin();
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", invoice.customer)
        .single();
      if (user?.id) {
        await supabase.from("admin_notes").insert({
          user_id: user.id,
          project_id: null,
          note: JSON.stringify({
            type: "invoice_payment_failed",
            invoice_id: invoice.id,
            amount_due: invoice.amount_due,
            attempt_count: invoice.attempt_count,
            customer_email: invoice.customer_email,
            failed_at: new Date().toISOString(),
          }),
        });
      }
    } catch (e) { console.error("invoice.payment_failed handler error:", e); }
  }

  // ── Checkout expired → mark pending project as failed so admin is alerted ──
  if (event.type === "checkout.session.expired") {
    const session = event.data.object as any;
    const { type, orderId } = session.metadata || {};
    // Only act on expired balance checkouts (upfront expiry is fine — user can restart)
    if (type === "balance" && orderId) {
      try {
        // Don't auto-fail — just log so admin knows customer didn't complete balance
        const supabase = supabaseAdmin();
        const { data: proj } = await supabase
          .from("projects")
          .select("id, user_id")
          .eq("id", orderId)
          .single();
        if (proj) {
          await supabase.from("admin_notes").insert({
            user_id: proj.user_id,
            project_id: orderId,
            note: JSON.stringify({
              type: "balance_checkout_expired",
              session_id: session.id,
              customer_email: session.customer_email,
              expired_at: new Date().toISOString(),
            }),
          });
        }
      } catch (e) { console.error("checkout.session.expired handler error:", e); }
    }
  }

  return c.json({ received: true });
});

// ────────────────────────────────────────────────────────────
// PAYMENTS — POST /api/payments/balance-checkout
// ────────────────────────────────────────────────────────────
app.post("/api/payments/balance-checkout", async (c) => {
  try {
    const { orderId, tier, email } = await c.req.json();
    if (!orderId || !tier || !email) return c.json({ error: "Missing fields" }, 400);

    const stripe = getStripe();
    const origin =
      c.req.header("origin") ||
      c.req.header("referer")?.replace(/\/$/, "") ||
      "https://codeexpertagent.com";

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

  // agent_sessions uses started_at (not created_at)
  const { count: activeSessions } = await supabase
    .from("agent_sessions")
    .select("id", { count: "exact", head: true })
    .gte("started_at", new Date(Date.now() - 86400000).toISOString());

  // Count active subscriptions
  const { count: activeSubscriptions } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("subscription_status", "active");

  return c.json({
    total_users: usersRes.count || 0,
    active_users: usersRes.count || 0,
    total_orders: projectsRes.count || 0,
    pending_orders: projects.filter((p) => p.status === "pending").length,
    in_progress_orders: projects.filter((p) => p.status === "in_progress").length,
    total_revenue: totalRevenue,
    this_month_revenue: monthRevenue,
    active_sessions: activeSessions || 0,
    active_subscriptions: activeSubscriptions || 0,
  });
});

// ────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/users
// ────────────────────────────────────────────────────────────
app.get("/api/admin/users", requireAdmin, async (c) => {
  const supabase = supabaseAdmin();

  // sites_rescued is the integer field that maps to "credits" in the admin UI
  const { data: users, error } = await supabase
    .from("users")
    .select("id, email, name, role, sites_rescued, created_at, projects(id, status, upfront_amount)")
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);

  // Expose sites_rescued as credits for the admin panel
  const normalized = (users || []).map((u: any) => ({
    ...u,
    credits: u.sites_rescued ?? 0,
  }));

  return c.json({ users: normalized });
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
// ────────────────────────────────────────────────────────────
app.post("/api/admin/orders/:id/status", requireAdmin, async (c) => {
  const orderId = c.req.param("id");
  const { status } = await c.req.json();
  const supabase = supabaseAdmin();

  const { error } = await supabase
    .from("projects")
    .update({
      status,
      ...(status === "delivered" ? { delivered_at: new Date().toISOString() } : {}),
    })
    .eq("id", orderId);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// ADMIN — POST /api/admin/orders/:id/deliver
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

  await supabase
    .from("projects")
    .update({ status: "awaiting_payment", delivered_at: new Date().toISOString() })
    .eq("id", orderId);

  const origin = c.req.header("origin") || "https://www.codeexpertagent.com";

  const balancePriceIds: Record<string, string> = {
    SITE:   process.env.STRIPE_SITE_BALANCE_PRICE_ID   || "price_1TQt0aGusAHZYXWWVlliF9Qd",
    CODE:   process.env.STRIPE_CODE_BALANCE_PRICE_ID   || "price_1TQt0aGusAHZYXWWaopyNgvy",
    BUNDLE: process.env.STRIPE_BUNDLE_BALANCE_PRICE_ID || "price_1TQt0aGusAHZYXWWxEwTktKL",
  };

  const priceId      = balancePriceIds[order.tier] || balancePriceIds.SITE;
  const customerEmail = (order.users as any)?.email || "";
  const balanceUrl    = `${origin}/pay-balance?order_id=${orderId}&tier=${order.tier.toLowerCase()}&email=${encodeURIComponent(customerEmail)}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/success?type=balance&order_id=${orderId}`,
      cancel_url: balanceUrl,
      customer_email: customerEmail,
      metadata: { type: "balance", orderId, tier: order.tier },
    });

    // ── Email customer: project delivered, balance due ──
    // Uses Supabase magic-link email → redirects straight to pay-balance page
    if (customerEmail) {
      try {
        await supabaseAdmin().auth.admin.generateLink({
          type: "magiclink",
          email: customerEmail,
          options: {
            redirectTo: balanceUrl,
          },
        });
      } catch (emailErr: any) {
        // Non-fatal — admin still gets the URL to share manually
        console.error("Balance notification email error (non-fatal):", emailErr.message);
      }
    }

    return c.json({ success: true, checkoutUrl: session.url, balanceUrl });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// ADMIN — POST /api/admin/users/:id/credits
// Maps to sites_rescued column (credits column doesn't exist in this schema)
// ────────────────────────────────────────────────────────────
app.post("/api/admin/users/:id/credits", requireAdmin, async (c) => {
  const userId = c.req.param("id");
  const { action, amount } = await c.req.json();
  const supabase = supabaseAdmin();

  const { data: user } = await supabase
    .from("users")
    .select("sites_rescued")
    .eq("id", userId)
    .single();

  const current = (user as any)?.sites_rescued || 0;
  const next = action === "add" ? current + amount : Math.max(0, current - amount);

  const { error } = await supabase
    .from("users")
    .update({ sites_rescued: next })
    .eq("id", userId);

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
    await supabase.auth.admin.updateUserById(userId, { ban_duration: "87600h" });
  } else {
    await supabase.auth.admin.updateUserById(userId, { ban_duration: "none" });
  }

  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// USER — GET /api/user/dashboard
// Returns user profile + projects + subscription status
// ────────────────────────────────────────────────────────────
app.get("/api/user/dashboard", async (c) => {
  const authHeader = c.req.header("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);

  const supabase = supabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: "Unauthorized" }, 401);

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, name, role, subscription_status, subscription_tier, stripe_subscription_id")
    .eq("id", user.id)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, tier, status, upfront_amount, balance_amount, description, github_repo, site_url, created_at, delivered_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return c.json({ user: profile || {}, projects: projects || [] });
});

// ────────────────────────────────────────────────────────────
// USER — GET /api/user/credentials
// Returns saved providers list (names only, tokens masked)
// ────────────────────────────────────────────────────────────
app.get("/api/user/credentials", async (c) => {
  const authHeader = c.req.header("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);
  const supabase = supabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: "Unauthorized" }, 401);

  const { data } = await supabase
    .from("user_credentials")
    .select("provider, created_at, updated_at")
    .eq("user_id", user.id)
    .order("provider");

  // Return which providers are saved (never return actual tokens)
  const saved = (data || []).map((r: any) => ({
    provider: r.provider,
    saved: true,
    updated_at: r.updated_at || r.created_at,
  }));

  return c.json({ credentials: saved });
});

// ────────────────────────────────────────────────────────────
// USER — POST /api/user/credentials
// Save or update a credential (upsert by provider)
// ────────────────────────────────────────────────────────────
app.post("/api/user/credentials", async (c) => {
  const authHeader = c.req.header("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);
  const supabase = supabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: "Unauthorized" }, 401);

  const { provider, access_token, metadata } = await c.req.json();
  if (!provider || !access_token?.trim()) {
    return c.json({ error: "provider and access_token are required" }, 400);
  }

  const VALID_PROVIDERS = ["github", "vercel", "supabase_url", "supabase_key", "anthropic"];
  if (!VALID_PROVIDERS.includes(provider)) {
    return c.json({ error: "Invalid provider" }, 400);
  }

  const { error: upsertErr } = await supabase
    .from("user_credentials")
    .upsert(
      {
        user_id: user.id,
        provider,
        access_token: access_token.trim(),
        metadata: metadata || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );

  if (upsertErr) return c.json({ error: upsertErr.message }, 500);
  return c.json({ success: true, provider });
});

// ────────────────────────────────────────────────────────────
// USER — DELETE /api/user/credentials/:provider
// Remove a saved credential
// ────────────────────────────────────────────────────────────
app.delete("/api/user/credentials/:provider", async (c) => {
  const authHeader = c.req.header("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);
  const supabase = supabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: "Unauthorized" }, 401);

  const provider = c.req.param("provider");
  await supabase
    .from("user_credentials")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// USER — POST /api/user/refund-request
// Submit a refund request
// ────────────────────────────────────────────────────────────
app.post("/api/user/refund-request", async (c) => {
  const authHeader = c.req.header("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);

  const supabase = supabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: "Unauthorized" }, 401);

  const { projectId, reason } = await c.req.json();
  if (!projectId || !reason?.trim()) return c.json({ error: "Project ID and reason are required" }, 400);

  // Verify project belongs to this user
  const { data: project } = await supabase
    .from("projects")
    .select("id, status, user_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (!project) return c.json({ error: "Project not found" }, 404);

  // Store refund request in admin_notes table (with type prefix)
  const { error: insertErr } = await supabase.from("admin_notes").insert({
    user_id: user.id,
    project_id: projectId,
    note: JSON.stringify({ type: "refund_request", reason, status: "pending", submitted_at: new Date().toISOString() }),
  });

  if (insertErr) return c.json({ error: insertErr.message }, 500);
  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// STRIPE — POST /api/stripe/subscribe
// Create a subscription checkout session
// ────────────────────────────────────────────────────────────
app.post("/api/stripe/subscribe", async (c) => {
  const authHeader = c.req.header("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);

  const supabase = supabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: "Unauthorized" }, 401);

  const { priceId } = await c.req.json();
  if (!priceId) return c.json({ error: "priceId required" }, 400);

  const { data: profile } = await supabase
    .from("users")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  const origin = c.req.header("origin") || "https://codeexpertagent.com";

  try {
    const sessionParams: any = {
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${origin}/dashboard?subscribed=true`,
      cancel_url: `${origin}/dashboard`,
      customer_email: profile?.email || user.email,
      metadata: { userId: user.id, priceId },
    };

    if (profile?.stripe_customer_id) {
      sessionParams.customer = profile.stripe_customer_id;
      delete sessionParams.customer_email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return c.json({ url: session.url });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// STRIPE — POST /api/stripe/portal
// Create Stripe billing portal session
// ────────────────────────────────────────────────────────────
app.post("/api/stripe/portal", async (c) => {
  const authHeader = c.req.header("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return c.json({ error: "Unauthorized" }, 401);
  const token = authHeader.slice(7);

  const supabase = supabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: "Unauthorized" }, 401);

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return c.json({ error: "No billing account found. Please subscribe first." }, 400);
  }

  const stripe = getStripe();
  const origin = c.req.header("origin") || "https://codeexpertagent.com";

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    });
    return c.json({ url: session.url });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// ADMIN — GET /api/admin/refund-requests
// ────────────────────────────────────────────────────────────
app.get("/api/admin/refund-requests", requireAdmin, async (c) => {
  const supabase = supabaseAdmin();

  const { data: notes, error } = await supabase
    .from("admin_notes")
    .select("id, user_id, project_id, note, created_at, users(email, name), projects(tier, upfront_amount)")
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);

  // Filter to only refund request notes and parse JSON
  const requests = (notes || [])
    .filter((n: any) => {
      try { return JSON.parse(n.note).type === "refund_request"; } catch { return false; }
    })
    .map((n: any) => {
      const parsed = JSON.parse(n.note);
      return {
        id: n.id,
        user_id: n.user_id,
        project_id: n.project_id,
        reason: parsed.reason,
        status: parsed.status || "pending",
        created_at: n.created_at,
        users: n.users,
        projects: n.projects,
      };
    });

  return c.json({ requests });
});

// ────────────────────────────────────────────────────────────
// ADMIN — POST /api/admin/refund-requests/:id/approve
// Issue Stripe refund + mark resolved
// ────────────────────────────────────────────────────────────
app.post("/api/admin/refund-requests/:id/approve", requireAdmin, async (c) => {
  const noteId = c.req.param("id");
  const supabase = supabaseAdmin();
  const stripe = getStripe();

  const { data: note } = await supabase
    .from("admin_notes")
    .select("*, projects(upfront_payment_id, upfront_amount)")
    .eq("id", noteId)
    .single();

  if (!note) return c.json({ error: "Not found" }, 404);

  try {
    const paymentIntentId = (note.projects as any)?.upfront_payment_id;
    if (paymentIntentId) {
      // Issue Stripe refund
      await stripe.refunds.create({ payment_intent: paymentIntentId });
    }

    // Update note status
    const parsed = JSON.parse(note.note);
    await supabase.from("admin_notes").update({
      note: JSON.stringify({ ...parsed, status: "approved", resolved_at: new Date().toISOString() }),
    }).eq("id", noteId);

    // Update project status to reflect refunded
    if (note.project_id) {
      await supabase.from("projects").update({ status: "failed" }).eq("id", note.project_id);
    }

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// ADMIN — POST /api/admin/refund-requests/:id/deny
// ────────────────────────────────────────────────────────────
app.post("/api/admin/refund-requests/:id/deny", requireAdmin, async (c) => {
  const noteId = c.req.param("id");
  const supabase = supabaseAdmin();

  const { data: note } = await supabase.from("admin_notes").select("*").eq("id", noteId).single();
  if (!note) return c.json({ error: "Not found" }, 404);

  try {
    const parsed = JSON.parse(note.note);
    await supabase.from("admin_notes").update({
      note: JSON.stringify({ ...parsed, status: "denied", resolved_at: new Date().toISOString() }),
    }).eq("id", noteId);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ────────────────────────────────────────────────────────────
// STRIPE WEBHOOK — handle subscription events
// (extended from the existing checkout.session.completed)
// ────────────────────────────────────────────────────────────
app.post("/api/stripe/subscription-webhook", async (c) => {
  const body = await c.req.text();
  const sig = c.req.header("stripe-signature") || "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  const stripe = getStripe();

  let event: any;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return c.json({ error: `Webhook error: ${err.message}` }, 400);
  }

  const supabase = supabaseAdmin();

  try {
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const sub = event.data.object as any;
      const customerId = sub.customer as string;
      const status = sub.status;
      const priceId = sub.items?.data?.[0]?.price?.id || "";
      const tier = priceId.includes("QsSE8sGn") ? "monthly_priority" : "monthly_single";

      // Find user by Stripe customer ID
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId);

      if (users && users.length > 0) {
        await supabase.from("users").update({
          stripe_subscription_id: sub.id,
          subscription_status: status,
          subscription_tier: tier,
        }).eq("stripe_customer_id", customerId);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as any;
      const customerId = sub.customer as string;
      await supabase.from("users").update({
        subscription_status: "canceled",
        stripe_subscription_id: null,
      }).eq("stripe_customer_id", customerId);
    }

    // Handle subscription checkout completion → save customer ID
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      if (session.mode === "subscription" && session.metadata?.userId) {
        await supabase.from("users").update({
          stripe_customer_id: session.customer as string,
          subscription_status: "active",
          subscription_tier: session.metadata.priceId?.includes("QsSE8sGn") ? "monthly_priority" : "monthly_single",
          stripe_subscription_id: session.subscription as string,
        }).eq("id", session.metadata.userId);
      }
    }
  } catch (err) {
    console.error("Subscription webhook error:", err);
  }

  return c.json({ received: true });
});

// ────────────────────────────────────────────────────────────
// CRON — GET /api/cron/deadline  (runs daily at 08:00 UTC)
// Enforces 7-day delivery guarantee + sends balance reminders
// Called by Vercel Cron — secured with CRON_SECRET header
// ────────────────────────────────────────────────────────────
app.get("/api/cron/deadline", async (c) => {
  const cronSecret = process.env.CRON_SECRET || "";
  const auth = c.req.header("authorization") || "";
  // Vercel cron passes the secret automatically; manual calls need it too
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const supabase = supabaseAdmin();
  const stripe   = getStripe();
  const origin   = "https://www.codeexpertagent.com";

  const sevenDaysAgo    = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const results = { autoRefunded: 0, remindersSent: 0, errors: [] as string[] };

  // ── 1. AUTO-REFUND: pending/in_progress projects > 7 days old ──
  const { data: overdueProjects } = await supabase
    .from("projects")
    .select("id, tier, upfront_amount, upfront_payment_id, user_id, users(email, name)")
    .in("status", ["pending", "in_progress"])
    .lt("created_at", sevenDaysAgo);

  for (const project of overdueProjects || []) {
    try {
      // Issue Stripe refund on the upfront payment
      if (project.upfront_payment_id) {
        await stripe.refunds.create({
          payment_intent: project.upfront_payment_id,
          metadata: { project_id: project.id, reason: "7-day delivery guarantee auto-refund" },
        });
      }

      // Mark project failed
      await supabase
        .from("projects")
        .update({ status: "failed" })
        .eq("id", project.id);

      // Notify customer via magic link email
      const customerEmail = (project.users as any)?.email;
      if (customerEmail) {
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: customerEmail,
          options: { redirectTo: `${origin}/dashboard` },
        }).catch(() => {});
      }

      // Log to admin_notes
      await supabase.from("admin_notes").insert({
        user_id: project.user_id,
        project_id: project.id,
        note: JSON.stringify({
          type: "auto_refund",
          reason: "7-day delivery guarantee not met",
          refunded_amount: project.upfront_amount,
          triggered_at: new Date().toISOString(),
        }),
      });

      results.autoRefunded++;
    } catch (err: any) {
      results.errors.push(`project ${project.id}: ${err.message}`);
    }
  }

  // ── 2. BALANCE REMINDER: awaiting_payment > 14 days ──
  const { data: awaitingProjects } = await supabase
    .from("projects")
    .select("id, tier, balance_amount, user_id, users(email, name)")
    .eq("status", "awaiting_payment")
    .lt("delivered_at", fourteenDaysAgo);

  for (const project of awaitingProjects || []) {
    try {
      const customerEmail = (project.users as any)?.email;
      if (customerEmail) {
        const payUrl = `${origin}/pay-balance?order_id=${project.id}&tier=${project.tier.toLowerCase()}&email=${encodeURIComponent(customerEmail)}`;
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: customerEmail,
          options: { redirectTo: payUrl },
        }).catch(() => {});
        results.remindersSent++;
      }
    } catch (err: any) {
      results.errors.push(`reminder ${project.id}: ${err.message}`);
    }
  }

  return c.json({ ok: true, timestamp: new Date().toISOString(), ...results });
});

// ────────────────────────────────────────────────────────────
// VERCEL HANDLER
// ────────────────────────────────────────────────────────────
export const config = { maxDuration: 300 };

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);

    let body: Buffer | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
    }

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    const webReq = new Request(url.toString(), {
      method: req.method || "GET",
      headers,
      body: body && body.length > 0 ? body : undefined,
      ...(body && body.length > 0 ? ({ duplex: "half" } as any) : {}),
    });

    const webRes = await app.fetch(webReq);

    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") {
        res.setHeader(key, value);
      }
    });

    if (webRes.body) {
      const reader = webRes.body.getReader();
      const isSSE = (webRes.headers.get("content-type") || "").includes("text/event-stream");
      if (isSSE) res.flushHeaders?.();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
        if (isSSE) (res as any).flush?.();
      }
    }

    res.end();
  } catch (err: any) {
    console.error("[handler error]", err.message, err.stack?.slice(0, 300));
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal server error", detail: err.message }));
    }
  }
}
