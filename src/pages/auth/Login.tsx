import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";

const Login = () => {
  const { signInAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const [email, setEmail] = useState("");

  const handleStubLogin = (role: "member" | "admin") => {
    signInAs(role);
    navigate(role === "admin" ? "/admin" : from);
  };

  return (
    <div className="container flex min-h-screen items-center justify-center py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Phase 1 stub auth — real Supabase auth lands in Phase 3.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@ethinx.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled
            />
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={() => handleStubLogin("member")}>Continue as Member</Button>
            <Button variant="outline" onClick={() => handleStubLogin("admin")}>
              Continue as Admin
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link to="/onboarding" className="text-primary underline-offset-4 hover:underline">
              Take the audit
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
