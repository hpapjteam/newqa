import React, { useState, useEffect } from "react";
import { 
  Database, 
  AlertTriangle, 
  RefreshCw, 
  Server, 
  ExternalLink, 
  Key, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  FileCode, 
  UploadCloud, 
  ShieldCheck, 
  Zap, 
  Globe, 
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Lock,
  Layers
} from "lucide-react";
import { 
  isSupabaseConfigured, 
  configureSupabase, 
  testSupabaseConnection, 
  getActiveSupabaseConfig 
} from "@/lib/supabase";

export function DatabaseRequirementScreen({ onRetry }: { onRetry?: () => void }) {
  const [activeTab, setActiveTab] = useState<"connect" | "sql" | "migration" | "env">("connect");
  
  // Form State
  const initialConfig = getActiveSupabaseConfig();
  const [url, setUrl] = useState(initialConfig.url || "https://ogklfczlceubykreddib.supabase.co");
  const [anonKey, setAnonKey] = useState(initialConfig.key || "");
  const [serviceKey, setServiceKey] = useState("");
  
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showServiceKey, setShowServiceKey] = useState(false);

  // Status & Progress
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    tables?: { campaigns: boolean; app_users: boolean; teams: boolean; activity_logs: boolean };
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // SQL & Schema State
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Migration file state
  const [migrationFile, setMigrationFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  useEffect(() => {
    // Check if server already has config we can prefill
    fetch("/api/supabase-config")
      .then(res => res.json())
      .then(data => {
        if (data && data.url && !url) {
          setUrl(data.url);
        }
        if (data && data.key && !anonKey) {
          setAnonKey(data.key);
        }
      })
      .catch(() => {});
  }, []);

  const handleTestConnection = async () => {
    if (!url || !anonKey) {
      setTestResult({
        success: false,
        message: "Please enter both Supabase Project URL and Public Anon Key."
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testSupabaseConnection(url, serviceKey || anonKey);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || "Failed to reach Supabase database."
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !anonKey) {
      setSaveError("Both Supabase Project URL and Anon API Key are required.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const res = await configureSupabase(url, anonKey, serviceKey);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => {
          if (onRetry) {
            onRetry();
          } else {
            window.location.reload();
          }
        }, 800);
      } else {
        setSaveError(res.message);
        setIsSaving(false);
      }
    } catch (err: any) {
      setSaveError(err?.message || "An unexpected error occurred while saving.");
      setIsSaving(false);
    }
  };

  const handleCopySql = () => {
    const sqlSchema = `-- Zeta & HP QA Automation Platform - Full Supabase Schema
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

CREATE TABLE IF NOT EXISTS public.folders (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  year TEXT DEFAULT '2026',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for folders" ON public.folders;
CREATE POLICY "Public access for folders" ON public.folders FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.campaigns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT DEFAULT 'IN',
  version_name TEXT DEFAULT 'Standard',
  status TEXT DEFAULT 'Draft',
  web_view_url TEXT DEFAULT '',
  figma_url TEXT DEFAULT '',
  html_source TEXT DEFAULT '',
  litmus_url TEXT DEFAULT '',
  design_type TEXT DEFAULT 'figma',
  team TEXT DEFAULT 'HP-APJ',
  mockup_file_name TEXT DEFAULT '',
  mockup_data_url TEXT DEFAULT '',
  outlook_file_name TEXT DEFAULT '',
  outlook_extracted_html TEXT DEFAULT '',
  outlook_subject TEXT DEFAULT '',
  folder_id TEXT DEFAULT '2026',
  user_email TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  last_edited_by TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by TEXT,
  deleted_at TIMESTAMPTZ,
  review_note TEXT DEFAULT '',
  qa_results JSONB DEFAULT '[]'::jsonb,
  checklists JSONB DEFAULT '[]'::jsonb,
  checklist_answers JSONB DEFAULT '{}'::jsonb,
  current_step INTEGER DEFAULT 1
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for campaigns" ON public.campaigns;
CREATE POLICY "Public access for campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'user',
  team TEXT DEFAULT 'HP-APJ',
  status TEXT DEFAULT 'active',
  quick_login_enabled BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for app_users" ON public.app_users;
CREATE POLICY "Public access for app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for teams" ON public.teams;
CREATE POLICY "Public access for teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT DEFAULT '',
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public access for activity_logs" ON public.activity_logs;
CREATE POLICY "Public access for activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.teams (id, name, description)
VALUES 
  ('team_hp_apj', 'HP-APJ', 'HP Asia Pacific & Japan Core Team'),
  ('team_zeta_qa', 'Zeta QA', 'Zeta Global Automation Team')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.app_users (id, name, email, role, team, status, quick_login_enabled)
VALUES 
  ('u_admin', 'Admin User', 'admin@example.com', 'admin', 'HP-APJ', 'active', true),
  ('u_qa', 'QA User', 'qa@example.com', 'user', 'HP-APJ', 'active', true),
  ('u_user', 'Standard User', 'user@example.com', 'user', 'HP-APJ', 'active', true)
ON CONFLICT (email) DO NOTHING;
`;
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyEnv = () => {
    const envStr = `VITE_SUPABASE_URL=${url || "https://your-project.supabase.co"}
VITE_SUPABASE_ANON_KEY=${anonKey || "your-anon-key"}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey || "your-service-role-key"}`;
    navigator.clipboard.writeText(envStr);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const handleImportBackup = async () => {
    if (!migrationFile) return;
    setIsImporting(true);
    setImportStatus(null);
    try {
      const text = await migrationFile.text();
      const parsed = JSON.parse(text);
      const res = await fetch("/api/import-migration-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportStatus("✅ Data backup restored successfully!");
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        setImportStatus(`❌ Import failed: ${data.error || "Invalid file"}`);
      }
    } catch (e: any) {
      setImportStatus(`❌ Import error: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-blue-600/30 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-cyan-600/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-4xl w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Top Branding Bar */}
        <div className="bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/80 border-b border-slate-800/80 px-6 py-5 sm:px-8 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20 shrink-0">
                <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                  <Database className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3" /> Setup Required
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    <Globe className="w-3 h-3" /> Multi-Domain Migration Ready
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Connect Supabase Database
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  HP-APJ & Zeta QA Automation Platform • Initial Setup & Cloud Sync
                </p>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-2xl shrink-0 self-start sm:self-auto">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-semibold text-slate-300">Database Disconnected</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800/80 bg-slate-950/40 px-4 sm:px-8 gap-1 sm:gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("connect")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "connect"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Zap className="w-4 h-4 text-blue-400" />
            1. Connect Database
          </button>
          <button
            onClick={() => setActiveTab("sql")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "sql"
                ? "border-purple-500 text-purple-400 bg-purple-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <FileCode className="w-4 h-4 text-purple-400" />
            2. SQL Schema Generator
          </button>
          <button
            onClick={() => setActiveTab("migration")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "migration"
                ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <UploadCloud className="w-4 h-4 text-emerald-400" />
            3. Restore Migration Backup
          </button>
          <button
            onClick={() => setActiveTab("env")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "env"
                ? "border-amber-500 text-amber-400 bg-amber-500/5"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            }`}
          >
            <Key className="w-4 h-4 text-amber-400" />
            4. Env Variables Guide
          </button>
        </div>

        {/* Tab 1: Connect Database Form */}
        {activeTab === "connect" && (
          <form onSubmit={handleSaveAndConnect} className="p-6 sm:p-8 space-y-6">
            <div className="bg-blue-950/30 border border-blue-800/40 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
              <Sparkles className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 space-y-1">
                <div className="font-bold text-white text-sm">Welcome! Complete Database Connection to Begin</div>
                <p className="leading-relaxed">
                  Enter your Supabase project credentials below. Once connected, your credentials will be securely saved, the database will be verified in real-time, and you will be routed directly to Login and QA Workspace.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Supabase URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Supabase Project URL <span className="text-rose-400">*</span></span>
                  <a 
                    href="https://supabase.com/dashboard" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-[11px] font-semibold text-blue-400 hover:underline flex items-center gap-1 normal-case tracking-normal"
                  >
                    Open Supabase Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Supabase Anon Key */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Supabase Anon / Public API Key <span className="text-rose-400">*</span></span>
                  <span className="text-[11px] font-normal text-slate-400 lowercase">project settings → api → anon public</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type={showAnonKey ? "text" : "password"}
                    required
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnonKey(!showAnonKey)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showAnonKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Supabase Service Role Key (Optional) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Service Role Key <span className="text-slate-400 font-normal normal-case">(Optional - Recommended for full backend sync)</span></span>
                  <span className="text-[11px] font-normal text-slate-400 lowercase">project settings → api → service_role</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showServiceKey ? "text" : "password"}
                    value={serviceKey}
                    onChange={(e) => setServiceKey(e.target.value)}
                    placeholder="Optional: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowServiceKey(!showServiceKey)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showServiceKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Test Result Box */}
            {testResult && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                testResult.success 
                  ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/40 border-rose-500/40 text-rose-300"
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <div className="flex items-center gap-2">
                    {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.latencyMs && (
                    <span className="font-mono text-[11px] bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700">
                      ⚡ {testResult.latencyMs}ms
                    </span>
                  )}
                </div>
                
                {testResult.tables && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/60 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className={testResult.tables.campaigns ? "text-emerald-400" : "text-amber-400"}>
                        {testResult.tables.campaigns ? "✓" : "○"}
                      </span>
                      <span>campaigns</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={testResult.tables.app_users ? "text-emerald-400" : "text-amber-400"}>
                        {testResult.tables.app_users ? "✓" : "○"}
                      </span>
                      <span>app_users</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={testResult.tables.teams ? "text-emerald-400" : "text-amber-400"}>
                        {testResult.tables.teams ? "✓" : "○"}
                      </span>
                      <span>teams</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={testResult.tables.activity_logs ? "text-emerald-400" : "text-amber-400"}>
                        {testResult.tables.activity_logs ? "✓" : "○"}
                      </span>
                      <span>activity_logs</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {saveError && (
              <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Database Connected! Redirecting to application...</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !url || !anonKey}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? "animate-spin text-blue-400" : "text-slate-400"}`} />
                {isTesting ? "Testing Connection..." : "Test Connection"}
              </button>

              <button
                type="submit"
                disabled={isSaving || saveSuccess || !url || !anonKey}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Connecting Database...</span>
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Connected!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save & Connect Database</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: SQL Schema Generator */}
        {activeTab === "sql" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-purple-950/30 border border-purple-800/40 rounded-2xl p-5">
              <div className="space-y-1 text-xs text-slate-300">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-purple-400" />
                  One-Click Supabase Schema Script
                </div>
                <p>
                  If you created a fresh Supabase project, run this SQL script in your Supabase SQL Editor to automatically create all required tables, security policies, and default QA accounts.
                </p>
              </div>
              <button
                onClick={handleCopySql}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition-all cursor-pointer shadow-md"
              >
                {copiedSql ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedSql ? "Copied SQL!" : "Copy SQL Schema"}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[11px] font-mono">1</span>
                  Open Supabase
                </div>
                <p className="text-[11px] text-slate-400">Navigate to your project dashboard at supabase.com</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[11px] font-mono">2</span>
                  Go to SQL Editor
                </div>
                <p className="text-[11px] text-slate-400">Click SQL Editor in the left sidebar → New Query</p>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-1.5">
                <div className="font-bold text-slate-100 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[11px] font-mono">3</span>
                  Paste & Run
                </div>
                <p className="text-[11px] text-slate-400">Paste the copied script and click the green Run button</p>
              </div>
            </div>

            {/* SQL Preview Box */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-slate-300 max-h-64 overflow-y-auto space-y-1">
              <div className="text-purple-400">-- Creates: campaigns, app_users, teams, folders, activity_logs</div>
              <div className="text-slate-500">CREATE TABLE IF NOT EXISTS public.campaigns (...);</div>
              <div className="text-slate-500">CREATE TABLE IF NOT EXISTS public.app_users (...);</div>
              <div className="text-slate-500">CREATE TABLE IF NOT EXISTS public.teams (...);</div>
              <div className="text-slate-500">CREATE TABLE IF NOT EXISTS public.folders (...);</div>
              <div className="text-slate-500">CREATE TABLE IF NOT EXISTS public.activity_logs (...);</div>
            </div>
          </div>
        )}

        {/* Tab 3: Migration Restore */}
        {activeTab === "migration" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-5 space-y-2 text-xs text-slate-300">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                Restore From Existing Domain / Instance Backup
              </div>
              <p className="leading-relaxed">
                Migrating from another server or domain? You can restore your entire campaign portfolio, folders, custom checklists, and team users in seconds using a JSON backup bundle generated from the Settings export tool.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/50 bg-slate-950/60 rounded-2xl p-6 text-center space-y-3 transition-all">
              <UploadCloud className="w-8 h-8 text-emerald-400 mx-auto" />
              <div>
                <label className="text-xs font-bold text-white hover:underline cursor-pointer">
                  <span>Choose Backup File (.json)</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => setMigrationFile(e.target.files?.[0] || null)}
                  />
                </label>
                <p className="text-[11px] text-slate-400 mt-1">
                  {migrationFile ? `Selected: ${migrationFile.name} (${(migrationFile.size / 1024).toFixed(1)} KB)` : "Upload backup bundle to restore data"}
                </p>
              </div>
            </div>

            {importStatus && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200">
                {importStatus}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleImportBackup}
                disabled={!migrationFile || isImporting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isImporting ? "animate-spin" : ""}`} />
                {isImporting ? "Restoring Data..." : "Restore & Sync Database"}
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Environment Variables */}
        {activeTab === "env" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between bg-amber-950/30 border border-amber-800/40 rounded-2xl p-5">
              <div className="space-y-1 text-xs text-slate-300">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  Environment Variables for Cloud Run, Vercel & Docker
                </div>
                <p>
                  You can also configure your database permanently in your hosting platform by setting these environment variables.
                </p>
              </div>
              <button
                onClick={handleCopyEnv}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow-md"
              >
                {copiedEnv ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedEnv ? "Copied!" : "Copy .env"}
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs space-y-2 text-slate-200 overflow-x-auto">
              <div><span className="text-slate-500"># Supabase Project URL</span></div>
              <div><span className="text-blue-400 font-bold">VITE_SUPABASE_URL</span>={url || "https://your-project.supabase.co"}</div>
              <div className="pt-2"><span className="text-slate-500"># Supabase Anon API Key</span></div>
              <div><span className="text-blue-400 font-bold">VITE_SUPABASE_ANON_KEY</span>={anonKey || "your-anon-key-here"}</div>
              <div className="pt-2"><span className="text-slate-500"># Supabase Service Role Key (Backend operations)</span></div>
              <div><span className="text-blue-400 font-bold">SUPABASE_SERVICE_ROLE_KEY</span>={serviceKey || "your-service-role-key-here"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Footer copyright & assistance */}
      <div className="mt-6 text-center text-xs text-slate-500 flex items-center gap-4">
        <span>© 2026 Zeta Global & HP-APJ QA Platform</span>
        <span>•</span>
        <span>Supabase PostgreSQL Engine</span>
      </div>
    </div>
  );
}
