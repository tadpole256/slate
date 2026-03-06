import { Pencil, Trash2 } from "lucide-react";
import type { AppTable } from "../../types/slate";

interface TableListItemProps {
  table: AppTable;
  active: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export function TableListItem({ table, active, onSelect, onRename, onDelete }: TableListItemProps) {
  return (
    <div className={`table-list-item ${active ? "active" : ""}`}>
      <button className="table-select" onClick={onSelect}>
        {table.display_name}
      </button>
      <div className="table-item-actions">
        <button className="icon-button" onClick={onRename} aria-label={`Rename ${table.display_name}`}>
          <Pencil size={14} />
        </button>
        <button className="icon-button danger" onClick={onDelete} aria-label={`Delete ${table.display_name}`}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
