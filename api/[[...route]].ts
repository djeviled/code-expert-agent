/**
 * Vercel serverless function — catch-all for /api/* routes
 * Wraps the Hono app using the official hono/vercel adapter.
 *
 * Node.js 20.x runtime (set in Vercel project settings or via config below)
 * maxDuration: 300s — allows long Claude streaming responses
 */
import { handle } from "hono/vercel";
import app from "../src/api/index";

// This config is read by Vercel's build system
export const config = {
  maxDuration: 300,
};

export default handle(app);
