import type { IncomingMessage, ServerResponse } from "node:http";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const errors: string[] = [];
  const ok: string[] = [];

  try { const { Hono } = await import("hono"); ok.push("hono"); } 
  catch(e: any) { errors.push("hono: " + e.message); }

  try { const { cors } = await import("hono/cors"); ok.push("hono/cors"); }
  catch(e: any) { errors.push("hono/cors: " + e.message); }

  try { const { createClient } = await import("@supabase/supabase-js"); ok.push("supabase"); }
  catch(e: any) { errors.push("supabase: " + e.message); }

  try { const Stripe = (await import("stripe")).default; ok.push("stripe"); }
  catch(e: any) { errors.push("stripe: " + e.message); }

  try { const Anthropic = (await import("@anthropic-ai/sdk")).default; ok.push("anthropic"); }
  catch(e: any) { errors.push("anthropic: " + e.message); }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok, errors }));
}
