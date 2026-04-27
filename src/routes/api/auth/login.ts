import type { Context } from "hono";

export default async (c: Context) => {
  const { email, password } = await c.req.json();

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL || "https://pbfkqyrplcdzbnetfwjm.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || "";

  if (!supabaseKey) {
    return c.json({ error: "Server misconfiguration" }, 500);
  }

  try {
    // Verify user exists via admin API
    const listRes = await fetch(
      `${supabaseUrl}/auth/v1/admin/users?page=1&per_page=50`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
      }
    );

    const listData = await listRes.json();
    const user = listData.users?.find((u: any) => u.email === email);

    if (!user) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    // For password verification, we rely on Supabase Auth
    // Since admin API doesn't verify passwords, we check via a workaround
    // Try to get a custom JWT via sign-in simulation
    const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        apikey: supabaseKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!tokenRes.ok) {
      return c.json({ error: "Invalid email or password" }, 401);
    }

    const tokenData = await tokenRes.json();

    // Get user profile
    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${user.id}&select=*`,
      {
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          apikey: supabaseKey,
        },
      }
    );
    const profiles = await profileRes.json();
    const profile = profiles[0] || { id: user.id, email: user.email, name: user.user_metadata?.name || "" };

    return c.json({
      token: tokenData.access_token,
      user: {
        id: user.id,
        email: user.email,
        name: profile.name || "",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return c.json({ error: "Login failed" }, 500);
  }
};