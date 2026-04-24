import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/providers/AuthProvider";
import { useTheme } from "@/providers/ThemeProvider";
import { EngineLayout, FormSection } from "@/components/engine";
import { ArrowRight } from "lucide-react";

const Settings = () => {
  const { user, role, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <EngineLayout
      title="Settings"
      description="Account and workspace preferences. Backend wiring activates when Lovable Cloud is enabled."
    >
      <FormSection title="Quick links" description="Jump to a focused settings area.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className="justify-between">
            <Link to="/settings/account">
              Account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="justify-between">
            <Link to="/settings/workspace">
              Workspace <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </FormSection>

      <FormSection title="Profile" description="Stub auth — read-only for now.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" value={role ?? "user"} disabled />
          </div>
        </div>
      </FormSection>

      <FormSection title="Appearance" description="Switch between light and dark.">
        <Button variant="outline" onClick={toggleTheme}>
          Current: {theme} — toggle
        </Button>
      </FormSection>

      <FormSection title="Session" description="Sign out of this workspace.">
        <Button variant="destructive" onClick={signOut}>
          Sign out
        </Button>
      </FormSection>
    </EngineLayout>
  );
};

export default Settings;
