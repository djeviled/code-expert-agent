/**
 * Vercel serverless function — catch-all for /api/* routes.
 * Uses @hono/node-server's getRequestListener for proper Node.js compatibility.
 * This supports streaming (SSE), all Node.js APIs, Stripe, Anthropic, Supabase.
 */
import { getRequestListener } from "@hono/node-server";
import app from "../src/api/index";

// Vercel function config
export const config = {
  maxDuration: 300,
};

// Export as default Node.js HTTP request handler
// This signature (IncomingMessage, ServerResponse) is what Vercel's Node.js runtime calls
export default getRequestListener(app);
