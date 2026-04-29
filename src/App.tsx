import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth-context";
import LandingPage from "./pages/landing";
import ChatPage from "./pages/chat";
import SignupPage from "./pages/signup";
import SuccessPage from "./pages/success";
import LoginPage from "./pages/login";
import AdminPage from "./pages/admin";
import PayBalancePage from "./pages/pay-balance";
import { ThemeProvider } from "./components/theme-provider";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Uses the same key as auth-context: "auth_token"
  const token = localStorage.getItem("auth_token");
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("auth_token");
  const isAdmin = localStorage.getItem("isAdmin") === "true";
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/pay-balance" element={<PayBalancePage />} />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
