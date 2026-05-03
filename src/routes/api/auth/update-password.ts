import type { Context } from "hono";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/update-password
 * Updates password using a valid recovery token
 */
export default async (c: Context) => {
  const { token, password } = await c.req.json();

  if (!token || !password) {
    return c.json({ error: "Token and password are required" }, 400);
  }

  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
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

    // Update password using the recovery token
    const { error } = await supabase.auth.updateUser(
      { password },
      { new: true }
    );

    if (error) {
      console.error("Password update error:", error);
      return c.json({ error: "Invalid or expired token" }, 401);
    }

    return c.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    return c.json({ error: "Failed to update password" }, 500);
  }
};
