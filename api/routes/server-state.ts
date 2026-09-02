import fs from "fs";
import { resolve } from "path";

const APP_STATE_FILE = resolve(process.cwd(), "app_state.json");

export interface ServerAppState {
  quick_login_enabled?: boolean;
  active_session?: any;
  users?: Array<any>;
  ai_agents?: Array<{ id: string; name: string; description: string; rules: string; is_default: boolean; assigned_teams?: string[] }>;
  supabase?: {
    url?: string;
    anonKey?: string;
    serviceRoleKey?: string;
  };
}

export const defaultAppState: ServerAppState = {
  quick_login_enabled: true,
  active_session: null,
  users: [],
  ai_agents: [{
    id: "default-1",
    name: "General QA Agent",
    description: "Default checking for UTMs, Alt tags, and spelling.",
    rules: "",
    is_default: true,
    assigned_teams: []
  }],
  supabase: {
    url: "",
    anonKey: ""
  }
};

export function loadAppState(): ServerAppState {
  try {
    if (fs.existsSync(APP_STATE_FILE)) {
      const data = fs.readFileSync(APP_STATE_FILE, "utf-8");
      const parsed = JSON.parse(data);
      return { 
        quick_login_enabled: parsed.quick_login_enabled !== undefined ? Boolean(parsed.quick_login_enabled) : true, 
        users: Array.isArray(parsed.users) ? parsed.users : defaultAppState.users, 
        ai_agents: Array.isArray(parsed.ai_agents) ? parsed.ai_agents : defaultAppState.ai_agents,
        supabase: parsed.supabase || defaultAppState.supabase 
      };
    }
  } catch (err) {
    console.warn("[Server] Error reading app_state.json:", err);
  }
  return { ...defaultAppState };
}

export function saveAppState(state: ServerAppState) {
  try {
    fs.writeFileSync(APP_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Server] Error writing app_state.json:", err);
  }
}

export let currentAppState = loadAppState();

export const getSupabaseServiceKey = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  currentAppState.supabase?.serviceRoleKey ||
  currentAppState.supabase?.anonKey ||
  "";

export const getSupabaseUrl = () =>
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  currentAppState.supabase?.url ||
  "";

export const getSupabaseAnonKey = () =>
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  currentAppState.supabase?.anonKey ||
  getSupabaseServiceKey();
