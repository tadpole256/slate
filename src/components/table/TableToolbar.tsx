import { Plus } from "lucide-react";
import type { AppTable } from "../../types/slate";

interface TableToolbarProps {
  table: AppTable | null;
  recordCount: number;
  onAddColumn: () => void;
}

export function TableToolbar({ table, recordCount, onAddColumn }: TableToolbarProps) {
  return (
    <div className="table-toolbar">
      <div>
        <h2>{table?.display_name ?? "No table selected"}</h2>
        <p>{recordCount} records</p>
      </div>

      <button className="action-button secondary" onClick={onAddColumn} disabled={!table}>
        <Plus size={15} />
        Column
      </button>
    </div>
  );
}
