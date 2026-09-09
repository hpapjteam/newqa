import { Router } from "express";
import { getCurrentAppState, saveAppState } from "../utils/state.ts";


import { getSupabaseServiceKey, getSupabaseUrl, getSupabaseAnonKey } from "../utils/db.ts";
import nodemailer from "nodemailer";
import { emailTemplate, escapeHtml, isPrivateOrInternalUrl } from "../utils/helpers.ts";

export const router = Router();

router.get("/api/supabase-config", (req, res) => {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const serviceKey = getSupabaseServiceKey();
  const isConfigured = Boolean(
    url && key && url !== "https://placeholder.supabase.co" && key !== "placeholder_key" && url.startsWith("https://") && key.length > 10
  );
  res.json({ 
    url, 
    key, 
    isConfigured, 
    hasServiceRoleKey: Boolean(serviceKey && serviceKey !== key)
  });
});

router.post("/api/save-supabase-config", async (req, res) => {
  const { url, key, anonKey, serviceRoleKey } = req.body || {};
  const targetUrl = (url || "").trim();
  const targetAnonKey = (anonKey || key || "").trim();
  const targetServiceKey = (serviceRoleKey || "").trim();

  if (!targetUrl || !targetAnonKey) {
    return res.status(400).json({ success: false, error: "Supabase Project URL and API Key are required." });
  }

  if (!targetUrl.startsWith("https://")) {
    return res.status(400).json({ success: false, error: "Supabase Project URL must start with https://" });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const testClient = createClient(targetUrl, targetServiceKey || targetAnonKey);
    
    // Save to state
    getCurrentAppState().supabase = {
      url: targetUrl,
      anonKey: targetAnonKey,
      serviceRoleKey: targetServiceKey || undefined
    };
    saveAppState(getCurrentAppState());

    // Update in-process env fallback as well
    process.env.VITE_SUPABASE_URL = targetUrl;
    process.env.VITE_SUPABASE_ANON_KEY = targetAnonKey;
    if (targetServiceKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = targetServiceKey;
    }

    console.log("[Server API] Supabase config updated & saved successfully:", targetUrl);
    return res.json({
      success: true,
      message: "Database connection configured and saved successfully!",
      isConfigured: true,
      url: targetUrl
    });
  } catch (err: any) {
    console.error("[Server API] Error saving supabase config:", err);
    return res.status(500).json({ success: false, error: err?.message || "Failed to save Supabase config." });
  }
});

router.post("/api/test-db-connection", async (req, res) => {
  const startTime = Date.now();
  const targetUrl = (req.body?.url || getSupabaseUrl() || "").trim();
  const targetKey = (req.body?.key || req.body?.anonKey || getSupabaseServiceKey() || getSupabaseAnonKey() || "").trim();

  if (!targetUrl || !targetKey) {
    return res.status(400).json({ success: false, message: "Missing Supabase URL or Key to test." });
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const testClient = createClient(targetUrl, targetKey);

    const tablesFound: string[] = [];
    const tablesToCheck = ["campaigns", "app_users", "teams", "activity_logs", "checklists", "countries", "folders"];
    
    for (const tbl of tablesToCheck) {
      try {
        const { error } = await testClient.from(tbl).select("count", { count: "exact", head: true });
        if (!error || error.code !== "42P01") {
          tablesFound.push(tbl);
        }
      } catch (e) {}
    }

    const latencyMs = Date.now() - startTime;
    return res.json({
      success: true,
      connected: true,
      latencyMs,
      tablesFound,
      totalTablesChecked: tablesToCheck.length,
      url: targetUrl
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      connected: false,
      latencyMs: Date.now() - startTime,
      error: err?.message || "Connection test failed."
    });
  }
});

router.get("/api/export-migration-data", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    let campaigns: any[] = [];
    let users: any[] = getCurrentAppState().users || [];
    let logs: any[] = [];
    let folders: any[] = [];

    if (supabaseUrl && supabaseKey) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      try {
        const { data: cData } = await client.from("campaigns").select("*");
        if (cData) campaigns = cData;
      } catch (e) {}
      try {
        const { data: uData } = await client.from("app_users").select("*");
        if (uData && uData.length > 0) users = uData;
      } catch (e) {}
      try {
        const { data: lData } = await client.from("activity_logs").select("*").limit(200);
        if (lData) logs = lData;
      } catch (e) {}
      try {
        const { data: fData } = await client.from("folders").select("*");
        if (fData) folders = fData;
      } catch (e) {}
    }

    const exportBundle = {
      exportVersion: "1.0",
      exportDate: new Date().toISOString(),
      appState: {
        quick_login_enabled: getCurrentAppState().quick_login_enabled
      },
      campaigns,
      users,
      folders,
      logs
    };

    res.setHeader("Content-Disposition", `attachment; filename="zeta_qa_migration_backup_${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    return res.json(exportBundle);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to export migration data" });
  }
});

router.post("/api/import-migration-data", async (req, res) => {
  try {
    const bundle = req.body;
    if (!bundle) {
      return res.status(400).json({ error: "Invalid backup bundle format" });
    }

    if (bundle.appState?.quick_login_enabled !== undefined) {
      getCurrentAppState().quick_login_enabled = Boolean(bundle.appState.quick_login_enabled);
    }
    if (Array.isArray(bundle.users) && bundle.users.length > 0) {
      getCurrentAppState().users = bundle.users;
    }
    saveAppState(getCurrentAppState());

    let insertedCampaigns = 0;
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey();
    if (supabaseUrl && supabaseKey && Array.isArray(bundle.campaigns) && bundle.campaigns.length > 0) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      for (const camp of bundle.campaigns) {
        try {
          await client.from("campaigns").upsert(camp);
          insertedCampaigns++;
        } catch (e) {}
      }
    }

    return res.json({
      success: true,
      message: `Successfully imported backup data! Restored ${insertedCampaigns} campaigns and ${bundle.users?.length || 0} users.`
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || "Failed to import migration data" });
  }
});

router.get("/api/app-settings", async (req, res) => {
  try {
    const supabaseUrl = getSupabaseUrl();
    const supabaseKey = getSupabaseServiceKey() || getSupabaseAnonKey();
    if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://")) {
      const { createClient } = await import("@supabase/supabase-js");
      const client = createClient(supabaseUrl, supabaseKey);
      const { data: dbSettings } = await client
        .from("app_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dbSettings && dbSettings.quick_login_enabled !== undefined && dbSettings.quick_login_enabled !== null) {
        getCurrentAppState().quick_login_enabled = Boolean(dbSettings.quick_login_enabled);
        saveAppState(getCurrentAppState());
      }
    }
  } catch (e) {}

  res.json({ quick_login_enabled: getCurrentAppState().quick_login_enabled });
});

router.post("/api/app-settings", async (req, res) => {
  if (req.body && req.body.quick_login_enabled !== undefined) {
    const newEnabled = Boolean(req.body.quick_login_enabled);
    getCurrentAppState().quick_login_enabled = newEnabled;

    // If master toggle is turned off, disable quick login for all users as well
    if (!newEnabled && Array.isArray(getCurrentAppState().users)) {
      getCurrentAppState().users = getCurrentAppState().users.map((u: any) => ({
        ...u,
        quick_login_enabled: false
      }));
    }

    saveAppState(getCurrentAppState());

    try {
      const supabaseUrl = getSupabaseUrl();
      const supabaseKey = getSupabaseServiceKey() || getSupabaseAnonKey();
      if (supabaseUrl && supabaseKey && supabaseUrl.startsWith("https://")) {
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(supabaseUrl, supabaseKey);
        
        const { data: rows } = await client.from("app_settings").select("id").limit(10);
        if (rows && rows.length > 0) {
          for (const row of rows) {
            await client.from("app_settings").update({
              quick_login_enabled: newEnabled,
              updated_at: new Date().toISOString()
            }).eq("id", row.id);
          }
        } else {
          await client.from("app_settings").insert([{
            quick_login_enabled: newEnabled,
            updated_at: new Date().toISOString()
          }]);
        }

        // If master toggle is turned off, update all users in Supabase app_users table to false
        if (!newEnabled) {
          try {
            await client.from("app_users").update({
              quick_login_enabled: false
            }).neq("status", "banned_never_match_placeholder");
          } catch (uErr) {
            console.warn("[Server] Note updating app_users quick_login_enabled:", uErr);
          }
        }
      }
    } catch (e) {
      console.warn("[Server] Notice updating Supabase app_settings:", e);
    }
  }
  res.json({ success: true, quick_login_enabled: getCurrentAppState().quick_login_enabled, users: getCurrentAppState().users });
});

export default router;

