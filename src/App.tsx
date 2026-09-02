import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { CampaignSetup } from "./pages/CampaignSetup";
import { Campaigns } from "./pages/Campaigns";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { supabase, isSupabaseConfigured, ensureSupabaseInitialized } from "@/lib/supabase";
import { getActiveSession, resolveCurrentSession, setActiveSession } from "@/lib/session";
import { savePreLoginRedirectUrl } from "@/lib/url-redirect";
import { Settings } from "./pages/Settings";
import { Profile } from "./pages/Profile";
import { Agents } from "./pages/Agents";
import { AgentChat } from "./pages/AgentChat";
import { UsersList } from "./pages/Users";
import { Checklists } from "./pages/Checklists";
import { Reports } from "./pages/Reports";
import { RecycleBin } from "./pages/RecycleBin";
import { DatabaseRequirementScreen } from "./components/DatabaseRequirementScreen";
import { SessionManager } from "./components/SessionManager";

function ProtectedLayout({
  isAuthenticated,
  isLoading,
  userRole,
  userEmail,
  checkAuthSession,
}: {
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: string;
  userEmail: string;
  checkAuthSession: () => void;
}) {
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-[#2b61d6] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = location.pathname + location.search + location.hash;
    if (currentPath && currentPath !== "/" && !currentPath.startsWith("/login") && !currentPath.startsWith("/signup")) {
      savePreLoginRedirectUrl(currentPath);
    }
    return <Login onLogin={checkAuthSession} />;
  }

  return (
    <SessionManager>
      <AppLayout role={userRole} userEmail={userEmail} />
    </SessionManager>
  );
}

export default function App() {
  const initialSession = getActiveSession();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(initialSession?.email));
  const [userRole, setUserRole] = useState<string>(() => {
    return initialSession?.role || "user";
  });
  const [userEmail, setUserEmail] = useState<string>(() => initialSession?.email || "");
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialSession?.email);
  const [dbConnected, setDbConnected] = useState<boolean>(() => isSupabaseConfigured());
  const sessionCheckSeq = useRef(0);

  // Sync DB state on mount & when server/client config changes
  useEffect(() => {
    const checkDb = async () => {
      await ensureSupabaseInitialized();
      setDbConnected(isSupabaseConfigured());
    };
    checkDb();

    const handleDbConfigChange = () => {
      setDbConnected(isSupabaseConfigured());
      checkAuthSession();
    };

    window.addEventListener("database_config_changed", handleDbConfigChange);
    return () => {
      window.removeEventListener("database_config_changed", handleDbConfigChange);
    };
  }, []);

  const checkAuthSession = useCallback(async () => {
    const currentSeq = ++sessionCheckSeq.current;

    // 1. Check in-memory / stored session first
    const memSession = getActiveSession();
    if (memSession && memSession.email) {
      if (currentSeq === sessionCheckSeq.current) {
        setIsAuthenticated(true);
        setUserEmail(memSession.email.trim().toLowerCase());
        setUserRole(memSession.role || "user");
        setIsLoading(false);
      }
    }

    // 2. Resolve session directly from persistent storage, cookie, server, or DB
    try {
      const resolved = await resolveCurrentSession();
      if (resolved && resolved.email && currentSeq === sessionCheckSeq.current) {
        setIsAuthenticated(true);
        setUserEmail(resolved.email.trim().toLowerCase());
        setUserRole(resolved.role || "user");
        setIsLoading(false);
        return;
      }
    } catch (e) {}

    if (currentSeq === sessionCheckSeq.current && !getActiveSession()?.email) {
      setIsAuthenticated(false);
      setUserEmail("");
      setUserRole("user");
      setIsLoading(false);
    }
  }, [dbConnected]);

  useEffect(() => {
    if (!dbConnected) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    checkAuthSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session && session.user) {
        const email = (session.user.email || "").trim().toLowerCase();
        let role = session.user.user_metadata?.role;
        let name = session.user.user_metadata?.name;

        // Query app_users table directly for real profile role & status
        try {
          const { data: appUser } = await supabase
            .from("app_users")
            .select("*")
            .eq("email", email)
            .maybeSingle();

          if (appUser) {
            role = appUser.role || role;
            name = appUser.name || name;
          }
        } catch (e) {}

        const finalRole = role || "user";
        setActiveSession({
          email,
          role: finalRole,
          name: name || email.split('@')[0],
          timestamp: new Date().toISOString()
        });

        setIsAuthenticated(true);
        setUserEmail(email);
        setUserRole(finalRole);
        setIsLoading(false);
      } else {
        checkAuthSession();
      }
    });

    const handleAuthEvent = () => {
      checkAuthSession();
    };

    window.addEventListener("app_auth_changed", handleAuthEvent);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("app_auth_changed", handleAuthEvent);
    };
  }, [dbConnected, checkAuthSession]);

  if (!dbConnected) {
    return <DatabaseRequirementScreen />;
  }

  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login onLogin={() => checkAuthSession()} />} />
        <Route
          path="/"
          element={
            <ProtectedLayout
              isAuthenticated={isAuthenticated}
              isLoading={isLoading}
              userRole={userRole}
              userEmail={userEmail}
              checkAuthSession={checkAuthSession}
            />
          }
        >
          <Route index element={<Dashboard userEmail={userEmail} userRole={userRole} />} />
          <Route path="campaigns/new" element={<CampaignSetup userEmail={userEmail} userRole={userRole} />} />
          <Route path="campaigns" element={<Campaigns userEmail={userEmail} userRole={userRole} />} />
          <Route path="campaign" element={<Navigate to="/campaigns" replace />} />
          <Route path="recycle-bin" element={<RecycleBin userEmail={userEmail} userRole={userRole} />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<UsersList role={userRole} userEmail={userEmail} />} />
          <Route path="settings" element={<Settings role={userRole} userEmail={userEmail} />} />
          <Route path="profile" element={<Profile role={userRole} userEmail={userEmail} />} />
          <Route path="agents" element={<Agents role={userRole} />} />
          <Route path="agents/:id/edit" element={<Agents role={userRole} />} />
          <Route path="agents/:id/chat" element={<AgentChat role={userRole} />} />
          <Route path="checklists" element={<Checklists role={userRole} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

