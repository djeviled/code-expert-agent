/**
 * Vercel serverless function — catches all /api/* requests
 * and routes them through the Hono app.
 *
 * Runtime: nodejs20.x (for Stripe SDK, Anthropic SDK, full Node.js compat)
 * Max duration: 300s (allows Claude streaming responses)
 */
import { handle } from "hono/vercel";
import app from "../src/api/index";

export const config = {
  runtime: "nodejs20.x",
  maxDuration: 300,
};

export default handle(app);
