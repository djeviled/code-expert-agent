import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://pbfkqyrplcdzbnetfwjm.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseAnonKey && import.meta.env.DEV) {
  console.warn(
    "⚠️ VITE_SUPABASE_ANON_KEY is not set. Add it to your .env file.\n" +
    "Get it from: https://supabase.com/dashboard/project/pbfkqyrplcdzbnetfwjm/settings/api"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "SITE" | "CODE" | "BUNDLE";
  credits?: number;
  created_at: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}
