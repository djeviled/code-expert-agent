import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send reset link");
        return;
      }

      setIsSubmitted(true);
      toast.success("Check your email for reset instructions");
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-black text-red-500 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-950 border-red-900">
          <CardHeader className="space-y-2 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <CardTitle className="text-2xl text-green-500">CHECK YOUR EMAIL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              We've sent a password reset link to {email}. Click the link in the email to reset your password.
            </p>
            <p className="text-xs text-gray-500">
              The link will expire in 24 hours. If you don't see the email, check your spam folder.
            </p>
            <Button
              onClick={() => navigate("/login")}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-mono"
            >
              BACK TO LOGIN
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
          <CardTitle className="text-2xl text-red-500">FORGOT PASSWORD?</CardTitle>
          <CardDescription className="text-red-700">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-red-400">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                  Sending...
                </>
              ) : (
                "SEND RESET LINK"
              )}
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-red-400 hover:text-red-300">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
