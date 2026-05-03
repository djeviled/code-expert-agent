import type { Context } from "hono";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/password-reset
 * Initiates password reset flow by sending email
 */
export default async (c: Context) => {
  const { email } = await c.req.json();

  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL || "https://pbfkqyrplcdzbnetfwjm.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

  if (!supabaseKey) {
    return c.json({ error: "Server misconfiguration" }, 500);
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Use Supabase Auth's built-in password reset
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
      // Don't leak whether email exists
      return c.json({ message: "If an account exists with this email, a reset link will be sent shortly" });
    }

    return c.json({ message: "If an account exists with this email, a reset link will be sent shortly" });
  } catch (err) {
    console.error("Password reset error:", err);
    return c.json({ error: "Password reset failed" }, 500);
  }
};