/**
 * Vercel Cron — runs daily at 08:00 UTC
 * Enforces the 7-day delivery guarantee:
 *   - Projects pending/in_progress older than 7 days → auto-refund + mark failed
 *   - Projects awaiting_payment older than 14 days   → send reminder email
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const SUPABASE_URL        = process.env.SUPABASE_URL        || "https://pbfkqyrplcdzbnetfwjm.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const STRIPE_SK           = process.env.STRIPE_SECRET_KEY   || "";
const ORIGIN              = "https://www.codeexpertagent.com";

function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Only allow Vercel cron calls (or internal calls with secret)
  const authHeader = req.headers["authorization"] || "";
  const cronSecret = process.env.CRON_SECRET || "";
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const supabase = supabaseAdmin();
  const stripe   = new Stripe(STRIPE_SK, { apiVersion: "2025-04-30.basil" as any });

  const sevenDaysAgo    = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString();
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const results = { autoRefunded: 0, remindersSent: 0, errors: [] as string[] };

  // ── 1. AUTO-REFUND: pending/in_progress projects older than 7 days ──
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
          reason: "fraudulent", // closest Stripe reason — "not delivered"
          metadata: { project_id: project.id, reason: "7-day delivery guarantee auto-refund" },
        });
      }

      // Mark project failed
      await supabase
        .from("projects")
        .update({
          status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", project.id);

      // Send refund notification email via Supabase magic link
      const customerEmail = (project.users as any)?.email;
      if (customerEmail) {
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: customerEmail,
          options: {
            redirectTo: `${ORIGIN}/dashboard`,
            data: { reason: "auto_refund_7day" },
          },
        });
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
      console.log(`[cron/deadline] Auto-refunded project ${project.id} (${project.tier})`);
    } catch (err: any) {
      const msg = `project ${project.id}: ${err.message}`;
      results.errors.push(msg);
      console.error("[cron/deadline] Refund error:", msg);
    }
  }

  // ── 2. BALANCE REMINDER: awaiting_payment projects older than 14 days ──
  const { data: awaitingProjects } = await supabase
    .from("projects")
    .select("id, tier, balance_amount, user_id, users(email, name)")
    .eq("status", "awaiting_payment")
    .lt("delivered_at", fourteenDaysAgo);

  for (const project of awaitingProjects || []) {
    try {
      const customerEmail = (project.users as any)?.email;
      if (customerEmail) {
        // Send reminder via Supabase magic link → redirects to pay-balance page
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: customerEmail,
          options: {
            redirectTo: `${ORIGIN}/pay-balance?order_id=${project.id}&tier=${project.tier.toLowerCase()}&email=${encodeURIComponent(customerEmail)}`,
          },
        });
        results.remindersSent++;
        console.log(`[cron/deadline] Balance reminder sent for project ${project.id}`);
      }
    } catch (err: any) {
      const msg = `reminder project ${project.id}: ${err.message}`;
      results.errors.push(msg);
    }
  }

  console.log("[cron/deadline] Done:", results);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: true, ...results }));
}
