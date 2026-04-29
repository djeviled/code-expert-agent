/**
 * Vercel serverless function — catch-all for /api/* routes.
 * Uses @hono/node-server's getRequestListener for Node.js runtime.
 * Supports SSE streaming, all Node.js APIs, Stripe, Anthropic, Supabase.
 */
import { getRequestListener } from "@hono/node-server";
import app from "../src/api/index";

// Vercel function config
export const config = {
  maxDuration: 300,
};

// Pass app.fetch (the FetchCallback) not app itself
// Using 'as any' to bypass strict type checking — runtime behavior is correct
export default getRequestListener(app.fetch.bind(app) as any);
