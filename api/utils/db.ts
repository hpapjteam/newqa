import { getCurrentAppState } from "./state";

export const getSupabaseServiceKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  getCurrentAppState().supabase?.serviceRoleKey ||
  getCurrentAppState().supabase?.anonKey ||
  "";

export const getSupabaseUrl = () =>
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  getCurrentAppState().supabase?.url ||
  "";

export const getSupabaseAnonKey = () =>
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  getCurrentAppState().supabase?.anonKey ||
  getSupabaseServiceKey();
