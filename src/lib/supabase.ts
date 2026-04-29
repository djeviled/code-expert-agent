import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://pbfkqyrplcdzbnetfwjm.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseServiceKey && process.env.NODE_ENV !== "test") {
  console.warn(
    "⚠️ SUPABASE_SERVICE_KEY is not set. Server-side Supabase operations will fail.\n" +
    "Get it from: https://supabase.com/dashboard/project/pbfkqyrplcdzbnetfwjm/settings/api"
  );
}

// Server-side admin client (use only in API routes — never expose to client)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SITE" | "CODE" | "BUNDLE";
  credits?: number;
  created_at: string;
  updated_at: string;
}

export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function createUserProfile(
  id: string,
  email: string,
  name: string,
  role: UserProfile["role"] = "SITE"
): Promise<UserProfile> {
  const { data, error } = await supabase
    .from("users")
    .insert({ id, email, name, role })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data as UserProfile;
}

export async function updateUserRole(
  userId: string,
  role: UserProfile["role"]
): Promise<void> {
  const { error } = await supabase.from("users").update({ role }).eq("id", userId);
  if (error) throw new Error(`Failed to update user role: ${error.message}`);
}
