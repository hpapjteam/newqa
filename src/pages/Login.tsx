import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { savePreLoginRedirectUrl, executePostLoginRedirect } from "@/lib/url-redirect";
import { setActiveSession } from "@/lib/session";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, AlertCircle, Zap, ShieldCheck, UserCheck, Shield, User } from "lucide-react";

export function Login({ onLogin }: { onLogin: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [quickLoginEnabled, setQuickLoginEnabled] = useState(true);
  const [quickUsers, setQuickUsers] = useState<any[]>([]);

  const dbConfigured = isSupabaseConfigured();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectParam = params.get("redirect") || params.get("next");
    if (redirectParam) {
      savePreLoginRedirectUrl(decodeURIComponent(redirectParam));
    }

    const loadQuickSettingsAndUsers = async () => {
      // 1. Load global settings from DB / server
      let isGlobalQuickEnabled = true;
      let settingsFound = false;

      if (isSupabaseConfigured()) {
        try {
          const { data: dbSettings } = await supabase
            .from('app_settings')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (dbSettings && dbSettings.quick_login_enabled !== undefined && dbSettings.quick_login_enabled !== null) {
            isGlobalQuickEnabled = dbSettings.quick_login_enabled === true || dbSettings.quick_login_enabled === 'true' || dbSettings.quick_login_enabled === 1;
            settingsFound = true;
          }
        } catch (e) { }
      }

      if (!settingsFound) {
        try {
          const settingsRes = await fetch('/api/app-settings');
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (settingsData && settingsData.quick_login_enabled !== undefined && settingsData.quick_login_enabled !== null) {
              isGlobalQuickEnabled = Boolean(settingsData.quick_login_enabled);
            }
          }
        } catch (e) { }
      }

      setQuickLoginEnabled(isGlobalQuickEnabled);

      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase.from('app_users').select('*').neq('status', 'banned');
          if (!error && Array.isArray(data)) {
            const filtered = data.filter((u: any) => {
              const isQuick = u.quick_login_enabled !== false && u.quick_login_enabled !== "false";
              return isQuick;
            });
            setQuickUsers(filtered);
            return;
          }
        } catch (e) {
          console.error("Error loading quick users from DB:", e);
        }
      }

      // Fallback only if database is not configured
      let serverUsers: any[] = [];
      try {
        const usersRes = await fetch('/api/app-users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData && Array.isArray(usersData.users) && usersData.users.length > 0) {
            serverUsers = usersData.users;
          }
        }
      } catch (e) { }

      const filtered = serverUsers.filter((u: any) => {
        const isQuick = u.quick_login_enabled !== false && u.quick_login_enabled !== "false";
        return isQuick && u.status !== 'banned';
      });

      setQuickUsers(filtered);
    };

    loadQuickSettingsAndUsers();
  }, []);

  const completeLoginSession = async (userEmail: string, userRole?: string, userName?: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();

    let finalRole = userRole;
    let finalName = userName;

    if (!finalRole || !finalName) {
      try {
        const { data: dbUser } = await supabase.from('app_users').select('*').eq('email', cleanEmail).maybeSingle();
        if (dbUser) {
          if (dbUser.status === 'banned') {
            throw new Error("This account has been suspended or banned. Please contact an administrator.");
          }
          finalRole = dbUser.role || finalRole;
          finalName = dbUser.name || finalName;
        }
      } catch (err: any) {
        if (err.message?.includes("suspended") || err.message?.includes("banned")) throw err;
      }
    }

    if (!finalRole) {
      finalRole = cleanEmail.includes("admin") ? "admin" : "user";
    }
    if (!finalName) {
      finalName = cleanEmail.split('@')[0];
    }

    const sessionObj = {
      email: cleanEmail,
      role: finalRole,
      name: finalName,
      timestamp: new Date().toISOString()
    };
    setActiveSession(sessionObj);

    try {
      await supabase.from('app_users').update({
        last_login: new Date().toISOString()
      }).eq('email', cleanEmail);
    } catch (e) { }

    window.dispatchEvent(new Event("app_auth_changed"));
    if (onLogin) onLogin();
    executePostLoginRedirect(navigate);
  };

  const handleQuickLogin = async (quickEmail: string, role?: string, name?: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: dbUser } = await supabase.from('app_users').select('*').eq('email', quickEmail).maybeSingle();
      if (dbUser && dbUser.status === 'banned') {
        setError("This account has been suspended or banned.");
        setLoading(false);
        return;
      }

      await completeLoginSession(quickEmail, role || dbUser?.role, name || dbUser?.name);
    } catch (err: any) {
      setError(err.message || "An error occurred during quick login.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      // Check if user exists in DB first
      const { data: dbUser } = await supabase.from('app_users').select('*').eq('email', cleanEmail).maybeSingle();

      if (!dbUser) {
        setError("User not found. Please contact admin for password reset.");
        setLoading(false);
        return;
      }

      if (dbUser.status === 'banned') {
        setError("This account has been suspended or banned. Please contact an administrator.");
        setLoading(false);
        return;
      }

      const resetUrl = `${window.location.origin}/reset-password?email=${encodeURIComponent(cleanEmail)}`;
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, resetUrl })
      });
      if (!response.ok) throw new Error("Failed to send reset email");
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Error sending reset email");
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const { data: dbUser } = await supabase.from('app_users').select('*').eq('email', cleanEmail).maybeSingle();

      if (dbUser && dbUser.status === 'banned') {
        setError("This account has been suspended or banned. Please contact an administrator.");
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (!signInError) {
        await completeLoginSession(cleanEmail, dbUser?.role, dbUser?.name);
        setLoading(false);
        return;
      }

      setError("Invalid email or password.");
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen font-sans bg-white">
      {/* Left Column - Form */}
      <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col justify-between p-8 lg:p-12 shrink-0 bg-white z-10 relative">

        {/* Login Form */}
        <div className="w-full max-w-sm mx-auto flex flex-col justify-center flex-1 my-auto">
          <div className="flex justify-center mb-6">
            <img
              src="https://zeta-global.cdn.prismic.io/zeta-global/aeZqVMBOoF08xJYh_ZetaLogo.svg"
              alt="Zeta Global"
              className="h-10"
              referrerPolicy="no-referrer"
            />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-8 text-center">
            {isForgotPassword ? "Reset Password" : "Welcome"}
          </h1>



          {isForgotPassword ? (
            resetSent ? (
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 text-green-700 rounded-lg text-sm">
                  Password reset link has been sent to your email.
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setIsForgotPassword(false); setResetSent(false); }}>
                  Return to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                {error && (
                  <div className="p-3 text-sm rounded-md bg-destructive/10 text-destructive font-medium text-center border border-destructive/20">
                    {error}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-blue-50 border-slate-200 text-slate-900 focus-visible:ring-[#2b61d6] shadow-none h-11"
                  />
                </div>
                <div className="flex flex-col gap-3 pt-2">
                  <Button type="submit" className="bg-[#2b61d6] hover:bg-blue-700 text-white w-full h-10 shadow-sm" disabled={loading || !email}>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setIsForgotPassword(false)}>
                    Back to Login
                  </Button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div data-testid="login-error-alert" className="p-3 text-sm rounded-md bg-destructive/10 text-destructive font-medium text-center border border-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">Email</Label>
                <Input
                  id="email"
                  data-testid="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-blue-50 border-slate-200 text-slate-900 focus-visible:ring-[#2b61d6] shadow-none h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-slate-700">Password</Label>
                <div className="relative flex items-center">
                  <Input
                    id="password"
                    data-testid="login-password-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    placeholder="Enter your password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-blue-50 border-slate-200 text-slate-900 focus-visible:ring-[#2b61d6] shadow-none pr-11 h-11"
                  />
                  <button
                    type="button"
                    id="toggle-login-password-visibility"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-md transition-colors cursor-pointer z-10 focus:outline-none flex items-center justify-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowPassword((prev) => !prev);
                    }}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-600" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-500" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm text-[#2b61d6] hover:underline font-medium">
                  Forgot password?
                </button>
                <Button type="submit" data-testid="login-submit-button" className="bg-[#2b61d6] hover:bg-blue-700 text-white px-8 h-10 shadow-sm cursor-pointer" disabled={loading || !email || !password}>
                  {loading ? "Logging in..." : "Log in"}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer text */}
        <div className="text-xs text-slate-500 text-center">
          © 2001 - 2026 ZETA. All rights reserved | <a href="https://zetaglobal.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-[#2b61d6] hover:underline font-medium">Privacy Policy</a>
        </div>
      </div>

      {/* Right Column - Graphic */}
      <div className="hidden lg:block flex-1 relative bg-slate-900 overflow-hidden">
        <img 
          src="https://images.prismic.io/zeta-global/aeivC8BOoF08xNHt_cf3bedd3ee5ad018080168985b125309a1c65601.png" 
          alt="Zeta Background" 
          className="absolute inset-0 w-full h-full object-cover" 
          referrerPolicy="no-referrer" 
        />

        <div className="absolute inset-0 flex flex-col justify-end p-16 pb-24">
          <div className="text-white text-left max-w-lg z-10 drop-shadow-md">
            <h2 className="text-4xl font-bold mb-4">Empower your QA Workflow</h2>
            <p className="text-lg text-blue-100">Automate validations, streamline approvals, and launch campaigns with absolute confidence.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

