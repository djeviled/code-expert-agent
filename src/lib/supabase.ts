import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://pbfkqyrplcdzbnetfwjm.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "your_supabase_anon_key_here";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserContext {
  id: string;
  email: string;
  name: string;
  tier: "starter" | "professional" | "agency" | "free";
  created_at: string;
}

export async function getUserContext(email: string): Promise<UserContext | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) return null;
  return data as UserContext;
}

export async function createUser(email: string, name: string, tier: UserContext["tier"] = "free"): Promise<UserContext> {
  const { data, error } = await supabase
    .from("users")
    .insert({ email, name, tier })
    .select()
    .single();

  if (error) throw new Error(`Failed to create user: ${error.message}`);
  return data as UserContext;
}

export async function updateUserTier(email: string, tier: UserContext["tier"]): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ tier })
    .eq("email", email);

  if (error) throw new Error(`Failed to update user tier: ${error.message}`);
}