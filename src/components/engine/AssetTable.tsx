import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, EngineStatus } from "./StatusBadge";
import { cn } from "@/lib/utils";

export interface AssetRow {
  id: string;
  title: string;
  channel?: string;
  engine?: string;
  status: EngineStatus;
  updatedAt: string;
}

interface AssetTableProps {
  rows: AssetRow[];
  emptyState?: ReactNode;
  onRowClick?: (row: AssetRow) => void;
  className?: string;
}

/**
 * Reusable table for offers, assets, and distribution lists.
 * Designed for dense scanning by an operator/VA.
 */
export function AssetTable({
  rows,
  emptyState,
  onRowClick,
  className,
}: AssetTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
        {emptyState ?? "Nothing here yet."}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden",
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead className="hidden md:table-cell">Engine</TableHead>
            <TableHead className="hidden md:table-cell">Channel</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className={cn(onRowClick && "cursor-pointer hover:bg-muted/40")}
              onClick={() => onRowClick?.(row)}
            >
              <TableCell className="font-medium text-foreground">
                {row.title}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {row.engine ?? "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell text-muted-foreground">
                {row.channel ?? "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={row.status} />
              </TableCell>
              <TableCell className="hidden lg:table-cell text-muted-foreground">
                {row.updatedAt}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
