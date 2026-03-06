import { Pencil, Trash2 } from "lucide-react";
import type { AppField } from "../../types/slate";
import { readableFieldType } from "../../lib/format";

interface TableHeaderCellProps {
  field: AppField;
  onRename: (field: AppField) => void;
  onDelete: (field: AppField) => void;
}

export function TableHeaderCell({ field, onRename, onDelete }: TableHeaderCellProps) {
  return (
    <th>
      <div className="header-cell-content">
        <div>
          <strong>{field.display_name}</strong>
          <small>{readableFieldType(field.field_type)}</small>
        </div>
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
