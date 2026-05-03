import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState("");
  const [isTokenValid, setIsTokenValid] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Extract token from URL hash (Supabase redirects with #access_token=...)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const tokenType = params.get("type");

    if (accessToken && tokenType === "recovery") {
      setToken(accessToken);
    } else {
      setIsTokenValid(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Validation
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to update password");
        return;
      }

      toast.success("Password updated successfully!");
      navigate("/login");
    } catch (error) {
      toast.error("An error occurred while updating password");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isTokenValid) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-950 border-red-900">
          <CardHeader className="space-y-2 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
            <CardTitle className="text-2xl text-red-600">INVALID LINK</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              The password reset link is invalid or has expired.
            </p>
            <Button
              onClick={() => navigate("/forgot-password")}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-mono"
            >
              REQUEST NEW LINK
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-red-500 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-950 border-red-900">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-red-500">RESET PASSWORD</CardTitle>
          <CardDescription className="text-red-700">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-red-400">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-900 border-red-900 text-white placeholder:text-gray-600"
              />
              <p className="text-xs text-gray-500">Minimum 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-red-400">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-gray-900 border-red-900 text-white placeholder:text-gray-600"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-mono"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "UPDATE PASSWORD"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
