import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { EngineLayout, FormSection } from "@/components/engine";

const STORAGE_KEY = "ethinx.workspace.name";

const SettingsWorkspace = () => {
  const [name, setName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(STORAGE_KEY) ?? "";
  });
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, name.trim());
      toast({
        title: "Workspace updated",
        description: "Saved locally. Backend wiring will activate once the workspaces table is enabled.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <EngineLayout
      title="Workspace"
      description="Workspace name and team preferences for your ETHINX environment."
    >
      <FormSection
        title="Workspace name"
        description="Used in the sidebar header and exported reports."
      >
        <div className="grid gap-4 sm:max-w-md">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              placeholder="e.g. Acme Studio"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </FormSection>

      <FormSection
        title="Team & billing"
        description="Multi-seat workspaces and billing controls are coming soon."
      >
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
          Workspace table is not fully wired yet. Your workspace name is stored
          locally so the rest of the app can preview it. Team invites, roles,
          and billing will appear here once the backend is enabled.
        </div>
      </FormSection>
    </EngineLayout>
  );
};

export default SettingsWorkspace;
