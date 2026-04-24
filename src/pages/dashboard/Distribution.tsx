import { Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EngineLayout, AssetTable, type AssetRow } from "@/components/engine";

const ROWS: AssetRow[] = [];

const Distribution = () => (
  <EngineLayout
    title="Distribution"
    description="Plan when and where each asset goes out. Mark tasks as sent manually — nothing posts automatically."
    actions={
      <Button asChild size="sm">
        <Link to="/assets">
          <Plus className="mr-2 h-4 w-4" />
          Plan from asset
        </Link>
      </Button>
    }
  >
    <AssetTable
      rows={ROWS}
      emptyState={
        <span>
          No tasks planned. Pick an asset from the{" "}
          <Link to="/assets" className="text-primary underline-offset-4 hover:underline">
            Assets
          </Link>{" "}
          list and schedule it across channels.
        </span>
      }
    />
  </EngineLayout>
);

export default Distribution;
