/**
 * Vercel serverless function — catch-all for /api/* routes.
 * All API logic is in ./lib.ts (same directory = included in Vercel bundle).
 * Supports SSE streaming, Stripe, Anthropic, Supabase.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "./lib";

export const config = {
  maxDuration: 300,
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    // Build URL
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);

    // Read body
    let body: Buffer | null = null;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks)));
        req.on("error", reject);
      });
    }

    // Build Web API headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }

    // Create Web Request
    const webReq = new Request(url.toString(), {
      method: req.method || "GET",
      headers,
      body: body && body.length > 0 ? body : undefined,
      ...(body && body.length > 0 ? ({ duplex: "half" } as any) : {}),
    });

    // Call Hono app
    const webRes = await app.fetch(webReq);

    // Write status + headers
    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => {
      if (key.toLowerCase() !== "transfer-encoding") {
        res.setHeader(key, value);
      }
    });

    // Stream or buffer the response
    if (webRes.body) {
      const reader = webRes.body.getReader();
      const isSSE = (webRes.headers.get("content-type") || "").includes(
        "text/event-stream"
      );

      if (isSSE) {
        res.flushHeaders?.();
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
        if (isSSE) (res as any).flush?.();
      }
    }

    res.end();
  } catch (err: any) {
    console.error("[handler error]", err.message);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal server error", detail: err.message }));
    }
  }
}
