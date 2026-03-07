import { Pencil, Trash2 } from "lucide-react";
import type { AppField, SortDirection } from "../../types/slate";
import { readableFieldType } from "../../lib/format";

interface TableHeaderCellProps {
  field: AppField;
  sortDirection: SortDirection | null;
  onSort: (field: AppField) => void;
  onRename: (field: AppField) => void;
  onDelete: (field: AppField) => void;
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <span className="sort-indicator">▲</span>;
  if (direction === "desc") return <span className="sort-indicator">▼</span>;
  return <span className="sort-indicator inactive">⇅</span>;
}

export function TableHeaderCell({ field, sortDirection, onSort, onRename, onDelete }: TableHeaderCellProps) {
  return (
    <th>
      <div className="header-cell-content">
        <button
          className="header-cell-sort-btn"
          onClick={() => onSort(field)}
          title={sortDirection ? `Sorted ${sortDirection}` : "Click to sort"}
        >
          <strong>{field.display_name}</strong>
          <small>{readableFieldType(field.field_type)}</small>
          <SortIcon direction={sortDirection} />
        </button>
        <div className="header-cell-actions">
          <button className="icon-button" onClick={() => onRename(field)} aria-label="Rename column">
            <Pencil size={12} />
          </button>
          <button
            className="icon-button danger"
            onClick={() => onDelete(field)}
            aria-label="Delete column"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </th>
  );
}
