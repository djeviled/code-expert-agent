/**
 * Vercel serverless function — plain Node.js handler, no adapters.
 * Manually bridges IncomingMessage ↔ Web Request/Response.
 * Fully supports SSE streaming for the agent chat.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import app from "../src/api/index";

export const config = {
  maxDuration: 300,
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    // Build URL from incoming request
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `http://${host}`);

    // Read body for non-GET requests
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
      // Required for body in some Node.js versions
      ...(body && body.length > 0 ? { duplex: "half" } as any : {}),
    });

    // Call Hono app
    const webRes = await app.fetch(webReq);

    // Write status + headers
    res.statusCode = webRes.status;
    webRes.headers.forEach((value, key) => {
      // Skip headers that Node.js sets automatically
      if (key.toLowerCase() !== "transfer-encoding") {
        res.setHeader(key, value);
      }
    });

    // Handle streaming body (SSE) vs buffered body
    if (webRes.body) {
      const reader = webRes.body.getReader();

      // For SSE, flush immediately on each chunk
      const isSSE =
        (webRes.headers.get("content-type") || "").includes("text/event-stream");

      if (isSSE) {
        res.flushHeaders?.();
        (res as any).flush?.();
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
        // Force flush for SSE
        if (isSSE) (res as any).flush?.();
      }
      res.end();
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error("[Vercel handler error]", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Internal server error", message: err.message }));
    }
  }
}
