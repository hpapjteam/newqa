import fs from "fs";
import path from "path";
import appStateFallback from "../../app_state.json";

const APP_STATE_FILE = path.join(process.cwd(), "app_state.json");
const TMP_STATE_FILE = path.join("/tmp", "app_state.json");

export interface ServerAppState {
  quick_login_enabled: boolean;
  ai_agents?: Array<{
    id: string;
    name: string;
    description: string;
    rules: string;
    is_default: boolean;
    assigned_teams?: string[];
    model?: string;
    welcome_message?: string;
    conversation_starters?: string[];
    capabilities?: string[];
    mcp_servers?: string[];
  }>;
  active_session?: {
    email: string;
    role: string;
    name: string;
    team?: string;
    status?: string;
    avatar?: string;
    timestamp: string;
  } | null;
  users: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    team: string;
    status: string;
    quick_login_enabled: boolean;
    last_login?: string;
  }>;
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
  supabase: {
    url: "",
    anonKey: ""
  }
};

export function loadAppState(): ServerAppState {
  try {
    let targetFile = "";
    if (fs.existsSync(APP_STATE_FILE)) {
      targetFile = APP_STATE_FILE;
    } else if (fs.existsSync(TMP_STATE_FILE)) {
      targetFile = TMP_STATE_FILE;
    }

    if (targetFile) {
      const data = fs.readFileSync(targetFile, "utf-8");
      const parsed = JSON.parse(data);
      
      const quick_login_enabled = parsed.quick_login_enabled !== undefined ? Boolean(parsed.quick_login_enabled) : true;
      let users = Array.isArray(parsed.users) ? parsed.users : defaultAppState.users;
      let ai_agents = Array.isArray(parsed.ai_agents) ? parsed.ai_agents : undefined;

      return { 
        quick_login_enabled, 
        users, 
        ai_agents,
        supabase: parsed.supabase || defaultAppState.supabase 
      };
    }
  } catch (err) {
    console.warn("[Server] Error reading app_state.json from disk, falling back to static copy:", err);
  }

  // Resilient fallback for serverless environments
  if (appStateFallback) {
    const parsed = appStateFallback as any;
    return {
      quick_login_enabled: parsed.quick_login_enabled !== undefined ? Boolean(parsed.quick_login_enabled) : true,
      users: Array.isArray(parsed.users) ? parsed.users : defaultAppState.users,
      ai_agents: Array.isArray(parsed.ai_agents) ? parsed.ai_agents : undefined,
      supabase: parsed.supabase || defaultAppState.supabase
    };
  }

  return { ...defaultAppState };
}

export function saveAppState(state: ServerAppState) {
  try {
    fs.writeFileSync(APP_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    // If the root filesystem is read-only (e.g. AWS Lambda / Vercel Serverless Function), persist to /tmp
    try {
      fs.writeFileSync(TMP_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
    } catch {
      // In-memory state remains intact
    }
  }
}

// Singleton state
let currentAppState = loadAppState();

export function getCurrentAppState() {
  return currentAppState;
}

export function updateAppState(newState: Partial<ServerAppState>) {
  currentAppState = { ...currentAppState, ...newState };
  saveAppState(currentAppState);
}
