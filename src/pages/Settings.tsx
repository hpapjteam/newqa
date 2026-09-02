import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { 
  Database, Settings as SettingsIcon, Download, Upload, Shield, 
  CheckCircle2, XCircle, RefreshCw, Server, Key, Globe, Image as ImageIcon,
  Save, AlertTriangle, Code, Terminal, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function Settings({ role, userEmail }: { role: string; userEmail?: string }) {
  const isAdmin = role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "database";
  const [activeTab, setActiveTab] = useState(initialTab);

  // Database Tab State
  const [dbUrl, setDbUrl] = useState("");
  const [dbKey, setDbKey] = useState("");
  const [dbServiceKey, setDbServiceKey] = useState("");
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [dbSaveMsg, setDbSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // General Settings Tab State
  const [quickLoginEnabled, setQuickLoginEnabled] = useState(true);
  const [expandedLogo, setExpandedLogo] = useState("https://zetaglobal.com/wp-content/uploads/2023/02/zeta_logoPrimary.svg");
  const [collapsedLogo, setCollapsedLogo] = useState("https://companieslogo.com/img/orig/ZETA-424536bc.png");
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalSaveMsg, setGeneralSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Migration Tab State
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    // Load current Supabase config
    fetch("/api/supabase-config")
      .then(res => res.json())
      .then(data => {
        if (data.url) setDbUrl(data.url);
        if (data.key) setDbKey(data.key);
      })
      .catch(() => {});

    // Load general app settings
    fetch("/api/app-settings")
      .then(res => res.json())
      .then(data => {
        if (data.quick_login_enabled !== undefined) {
          setQuickLoginEnabled(Boolean(data.quick_login_enabled));
        }
      })
      .catch(() => {});

    // Load logos from database if available
    const loadLogos = async () => {
      try {
        const { data } = await supabase.from("app_settings").select("*").limit(1).maybeSingle();
        if (data) {
          if (data.expanded_logo_url) setExpandedLogo(data.expanded_logo_url);
          if (data.collapsed_logo_url) setCollapsedLogo(data.collapsed_logo_url);
        }
      } catch (e) {}
    };
    loadLogos();
  }, []);

  const handleTestConnection = async () => {
    setIsTestingDb(true);
    setTestResult(null);
    try {
      const response = await fetch("/api/test-db-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: dbUrl, key: dbKey })
      });
      const data = await response.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ connected: false, error: err?.message || "Network test failed." });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDb(true);
    setDbSaveMsg(null);
    try {
      const response = await fetch("/api/save-supabase-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: dbUrl,
          anonKey: dbKey,
          serviceRoleKey: dbServiceKey
        })
      });
      const data = await response.json();
      if (data.success) {
        setDbSaveMsg({ type: "success", text: "Supabase connection updated and verified successfully!" });
      } else {
        setDbSaveMsg({ type: "error", text: data.error || "Failed to save configuration." });
      }
    } catch (err: any) {
      setDbSaveMsg({ type: "error", text: err?.message || "Failed to save database configuration." });
    } finally {
      setIsSavingDb(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGeneral(true);
    setGeneralSaveMsg(null);
    try {
      // 1. Update server app settings
      await fetch("/api/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quick_login_enabled: quickLoginEnabled })
      });

      // 2. Update logos in database if possible
      try {
        await supabase.from("app_settings").upsert({
          id: "default_settings",
          expanded_logo_url: expandedLogo,
          collapsed_logo_url: collapsedLogo,
          quick_login_enabled: quickLoginEnabled,
          updated_at: new Date().toISOString()
        });
      } catch (dbErr) {}

      setGeneralSaveMsg({ type: "success", text: "Settings saved successfully!" });
    } catch (err: any) {
      setGeneralSaveMsg({ type: "error", text: err?.message || "Failed to save settings." });
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/export-migration-data");
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hp_qa_platform_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err: any) {
      alert("Failed to export backup: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsImporting(true);
        setImportResult(null);
        const parsed = JSON.parse(event.target?.result as string);
        const response = await fetch("/api/import-migration-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed)
        });
        const data = await response.json();
        if (data.success) {
          setImportResult(data.message || "Import completed successfully!");
        } else {
          setImportResult("Error: " + (data.error || "Failed to import data"));
        }
      } catch (err: any) {
        setImportResult("Failed to parse JSON file: " + err.message);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <SettingsIcon className="w-6 h-6 text-[#2b61d6]" />
          System Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure database connectivity, branding, authentication preferences, and migration backups
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        <button
          onClick={() => switchTab("database")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "database"
              ? "border-[#2b61d6] text-[#2b61d6] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Database className="w-4 h-4" />
          Database & Supabase
        </button>

        <button
          onClick={() => switchTab("general")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "general"
              ? "border-[#2b61d6] text-[#2b61d6] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <SettingsIcon className="w-4 h-4" />
          General & Branding
        </button>

        <button
          onClick={() => switchTab("migration")}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
            activeTab === "migration"
              ? "border-[#2b61d6] text-[#2b61d6] font-bold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Server className="w-4 h-4" />
          Backup & Migration
        </button>
      </div>

      {/* Tab: Database */}
      {activeTab === "database" && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-[#2b61d6]" />
                Supabase PostgreSQL Connection
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Live connection to your Supabase PostgreSQL cluster with schema auto-synchronization.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {dbSaveMsg && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium ${
                    dbSaveMsg.type === "success"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {dbSaveMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveDbConfig} className="space-y-4">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Project URL</Label>
                  <Input
                    required
                    placeholder="https://xyzcompany.supabase.co"
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Your Supabase project API URL (Settings &gt; API &gt; Project URL)
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Anon / Public API Key</Label>
                  <Input
                    required
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={dbKey}
                    onChange={(e) => setDbKey(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">
                    Service Role Key (Optional / Admin Only)
                  </Label>
                  <Input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={dbServiceKey}
                    onChange={(e) => setDbServiceKey(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="submit"
                    disabled={isSavingDb}
                    className="bg-[#2b61d6] hover:bg-[#2250b8] text-white text-xs font-semibold"
                  >
                    <Save className="w-3.5 h-3.5 mr-1.5" />
                    {isSavingDb ? "Saving..." : "Save Connection"}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTestingDb}
                    className="text-xs font-semibold"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isTestingDb ? "animate-spin" : ""}`} />
                    Test Connection
                  </Button>
                </div>
              </form>

              {/* Test Results Output */}
              {testResult && (
                <div
                  className={`mt-4 p-4 rounded-xl border text-xs space-y-2 ${
                    testResult.connected
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                      : "bg-rose-50/70 border-rose-200 text-rose-950"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {testResult.connected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Connected to Supabase ({testResult.latencyMs}ms)
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 text-rose-600" />
                        Connection Failed
                      </>
                    )}
                  </div>
                  {testResult.tablesFound && (
                    <p className="text-[11px] text-slate-600">
                      Found {testResult.tablesFound.length} required database tables:{" "}
                      <span className="font-semibold text-slate-800">
                        {testResult.tablesFound.join(", ")}
                      </span>
                    </p>
                  )}
                  {testResult.error && (
                    <p className="text-rose-700 font-mono text-[11px]">{testResult.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: General */}
      {activeTab === "general" && (
        <Card className="border-slate-200 shadow-xs">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-base text-slate-900 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-[#2b61d6]" />
              Platform Branding & Login Preferences
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Customize logos, title bar aesthetics, and quick authentication toggles.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {generalSaveMsg && (
              <div
                className={`p-3 rounded-lg text-xs font-medium ${
                  generalSaveMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {generalSaveMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">One-Click Quick Login</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Allow authorized QA team members to quickly select pre-configured accounts on the login screen.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickLoginEnabled}
                    onChange={(e) => setQuickLoginEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#2b61d6]"></div>
                </label>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Primary Header Logo URL (Expanded)</Label>
                <Input
                  value={expandedLogo}
                  onChange={(e) => setExpandedLogo(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Collapsed Sidebar Logo URL (Icon)</Label>
                <Input
                  value={collapsedLogo}
                  onChange={(e) => setCollapsedLogo(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isSavingGeneral}
                  className="bg-[#2b61d6] hover:bg-[#2250b8] text-white text-xs font-semibold"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {isSavingGeneral ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab: Migration */}
      {activeTab === "migration" && (
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-xs">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-[#2b61d6]" />
                Backup & Data Migration
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Export and import complete database snapshots including campaigns, folders, users, and activity logs.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {importResult && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-xs font-medium">
                  {importResult}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Export Card */}
                <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Download className="w-4 h-4 text-[#2b61d6]" />
                    Export Full Platform Snapshot
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Download a standardized JSON archive with all campaigns, QA results, users, folders, and audit logs.
                  </p>
                  <Button
                    onClick={handleExportData}
                    disabled={isExporting}
                    variant="outline"
                    className="w-full text-xs font-semibold gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isExporting ? "Exporting..." : "Download JSON Backup"}
                  </Button>
                </div>

                {/* Import Card */}
                <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-[#2b61d6]" />
                    Import Snapshot
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Restore previously exported campaigns and user state from a JSON backup file.
                  </p>
                  <label className="flex items-center justify-center gap-2 w-full h-9 px-4 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    {isImporting ? "Importing..." : "Select Backup JSON File"}
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      disabled={isImporting}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
export default Settings;
