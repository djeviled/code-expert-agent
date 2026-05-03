import type { Context } from "hono";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/auth/update-password
 * Updates password using a valid recovery token from Supabase email link.
 * The client extracts the access_token from the URL hash (#access_token=...&type=recovery)
 * and sends it here with the new password.
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
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

  if (!supabaseServiceKey) {
    return c.json({ error: "Server misconfiguration" }, 500);
  }

  try {
    // Step 1: Verify the recovery token and get the user
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error("Token verification error:", userError);
      return c.json({ error: "Invalid or expired reset link. Please request a new one." }, 401);
    }

    // Step 2: Update password using admin API (bypasses session requirement)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userData.user.id,
      { password }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return c.json({ error: "Failed to update password. Please try again." }, 500);
    }

    return c.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    return c.json({ error: "Failed to update password" }, 500);
  }
};
