import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider, useAuth } from "./lib/auth-context";
import LandingPage from "./pages/landing";
import ChatPage from "./pages/chat";
import SignupPage from "./pages/signup";
import SuccessPage from "./pages/success";
import LoginPage from "./pages/login";
import AdminPage from "./pages/admin";
import DashboardPage from "./pages/dashboard";
import PayBalancePage from "./pages/pay-balance";
import { ThemeProvider } from "./components/theme-provider";

/** Redirect after login: admin → /admin, everyone else → /dashboard */
function AuthRedirect() {
  const token = localStorage.getItem("auth_token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  if (!token) return <Navigate to="/login" replace />;
  return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("auth_token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("auth_token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  if (!token) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/pay-balance" element={<PayBalancePage />} />

            {/* Auth redirect — e.g. after login, decide where to go */}
            <Route path="/home" element={<AuthRedirect />} />

            {/* User dashboard */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

            {/* Chat — accessible to all logged-in users */}
            <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

            {/* Admin only */}
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Analytics />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
