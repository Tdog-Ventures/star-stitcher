import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EngineLayout, AssetTable, type AssetRow } from "@/components/engine";

const ROWS: AssetRow[] = [];

const Assets = () => (
  <EngineLayout
    title="Assets"
    description="Everything you've created across engines lives here. Reuse anything before writing new copy."
    actions={
      <Button asChild size="sm">
        <Link to="/engines">
          <Plus className="mr-2 h-4 w-4" />
          New from engine
        </Link>
      </Button>
    }
  >
    <AssetTable
      rows={ROWS}
      emptyState={
        <span>
          No saved assets yet. Open the{" "}
          <Link to="/engines/offer" className="text-primary underline-offset-4 hover:underline">
            Offer Engine
          </Link>{" "}
          to create your first one.
        </span>
      }
    />
  </EngineLayout>
);

export default Assets;
