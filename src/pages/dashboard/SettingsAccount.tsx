import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/providers/AuthProvider";
import { EngineLayout, FormSection } from "@/components/engine";

const SettingsAccount = () => {
  const { user, role, session, signOut } = useAuth();

  const status = session ? "Active" : "Signed out";
  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString()
    : "—";

  return (
    <EngineLayout
      title="Account"
      description="Your ETHINX identity, role, and session controls."
    >
      <FormSection title="Profile" description="Read-only account identity.">
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

      <FormSection title="Account status" description="Current session and account health.">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={session ? "default" : "secondary"}>{status}</Badge>
          <span className="text-muted-foreground">
            Member since <span className="text-foreground">{createdAt}</span>
          </span>
        </div>
      </FormSection>

      <FormSection title="Session" description="Sign out of this workspace.">
        <Button variant="destructive" onClick={signOut}>
          Sign out
        </Button>
      </FormSection>
    </EngineLayout>
  );
};

export default SettingsAccount;
