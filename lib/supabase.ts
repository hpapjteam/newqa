import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta?.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] || '';
  }
  return '';
};

const DEFAULT_SUPABASE_URL = 'https://ogklfczlceubykreddib.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na2xmY3psY2V1YnlrcmVkZGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MTkyMjgsImV4cCI6MjEwMDI5NTIyOH0.QsgQWfCRQZQiLUBbz84zpXrIsxEFDXXLRgj44-HO12E';

let activeUrl = getEnv('VITE_SUPABASE_URL') || getEnv('SUPABASE_URL') || DEFAULT_SUPABASE_URL;
let activeKey = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_SERVICE_ROLE_KEY') || DEFAULT_SUPABASE_ANON_KEY;

export let supabase: SupabaseClient = createClient(activeUrl, activeKey || 'placeholder_key');

export const isSupabaseConfigured = (): boolean => {
  const url = activeUrl;
  const key = activeKey;
  return Boolean(
    url && 
    key && 
    url !== 'https://placeholder.supabase.co' && 
    key !== 'placeholder_key' &&
    url.startsWith('https://') &&
    key.length > 10
  );
};

export const getActiveSupabaseConfig = () => {
  return {
    url: activeUrl,
    key: activeKey,
    isConfigured: isSupabaseConfigured()
  };
};

export async function testSupabaseConnection(url: string, key: string): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  tables?: { campaigns: boolean; app_users: boolean; teams: boolean; activity_logs: boolean };
}> {
  const startTime = Date.now();
  try {
    const cleanUrl = (url || '').trim();
    const cleanKey = (key || '').trim();
    if (!cleanUrl || !cleanKey) {
      return { success: false, message: "Please provide both Supabase Project URL and API Key" };
    }
    if (!cleanUrl.startsWith("https://")) {
      return { success: false, message: "Invalid URL. Project URL must start with https://" };
    }

    const testClient = createClient(cleanUrl, cleanKey);
    
    // Check key tables
    let campaignsOk = false;
    let usersOk = false;
    let teamsOk = false;
    let logsOk = false;

    try {
      const { error } = await testClient.from('campaigns').select('id', { head: true, count: 'exact' });
      if (!error || error.code !== '42P01') campaignsOk = true;
    } catch (e) {}

    try {
      const { error } = await testClient.from('app_users').select('id', { head: true, count: 'exact' });
      if (!error || error.code !== '42P01') usersOk = true;
    } catch (e) {}

    try {
      const { error } = await testClient.from('teams').select('id', { head: true, count: 'exact' });
      if (!error || error.code !== '42P01') teamsOk = true;
    } catch (e) {}

    try {
      const { error } = await testClient.from('activity_logs').select('id', { head: true, count: 'exact' });
      if (!error || error.code !== '42P01') logsOk = true;
    } catch (e) {}

    const latency = Date.now() - startTime;
    return {
      success: true,
      message: "Connected to Supabase database successfully!",
      latencyMs: latency,
      tables: { campaigns: campaignsOk, app_users: usersOk, teams: teamsOk, activity_logs: logsOk }
    };
  } catch (err: any) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      message: err?.message || "Connection failed. Please check URL and API Key.",
      latencyMs: latency
    };
  }
}

export async function configureSupabase(
  url: string, 
  anonKey: string, 
  serviceRoleKey?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const cleanUrl = (url || '').trim();
    const cleanKey = (anonKey || '').trim();
    const cleanServiceKey = (serviceRoleKey || '').trim();

    if (!cleanUrl || !cleanKey) {
      return { success: false, message: "Both Supabase Project URL and API Key are required." };
    }
    if (!cleanUrl.startsWith("https://")) {
      return { success: false, message: "Supabase Project URL must start with https://" };
    }

    activeUrl = cleanUrl;
    activeKey = cleanKey;
    supabase = createClient(activeUrl, activeKey);

    // Save to server so other tabs, incognito windows, and server routes persist it
    try {
      await fetch("/api/save-supabase-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: cleanUrl,
          key: cleanKey,
          anonKey: cleanKey,
          serviceRoleKey: cleanServiceKey
        })
      });
    } catch (err) {
      console.warn("[Supabase] Server config save notice:", err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent("database_config_changed", {
        detail: { isConfigured: true, url: cleanUrl }
      }));
    }

    return { success: true, message: "Database connected and saved successfully!" };
  } catch (err: any) {
    return { success: false, message: err?.message || "Failed to configure Supabase." };
  }
}

let initPromise: Promise<boolean> | null = null;

export async function ensureSupabaseInitialized(): Promise<boolean> {
  if (isSupabaseConfigured()) return true;

  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const res = await fetch("/api/supabase-config");
      if (res.ok) {
        const config = await res.json();
        if (config.isConfigured && config.url && config.key) {
          activeUrl = config.url;
          activeKey = config.key;
          supabase = createClient(activeUrl, activeKey);
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent("database_config_changed", {
              detail: { isConfigured: true, url: config.url }
            }));
          }
          
          console.log("[Supabase] Successfully initialized client from server API config");
          return true;
        }
      }
    } catch (err) {
      console.warn("[Supabase] Failed to fetch server config:", err);
    }
    return isSupabaseConfigured();
  })();

  return initPromise;
}

if (typeof window !== 'undefined') {
  ensureSupabaseInitialized().catch(() => {});
}
