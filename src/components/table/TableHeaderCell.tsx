import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AppField, SortDirection } from "../../types/slate";
import { readableFieldType } from "../../lib/format";

interface TableHeaderCellProps {
  field: AppField;
  sortDirection: SortDirection | null;
  width?: number;
  onSort: (field: AppField) => void;
  onRename: (field: AppField) => void;
  onDelete: (field: AppField) => void;
  onResizeStart?: (e: React.MouseEvent, fieldId: string) => void;
}

function SortIcon({ direction }: { direction: SortDirection | null }) {
  if (direction === "asc") return <span className="sort-indicator">▲</span>;
  if (direction === "desc") return <span className="sort-indicator">▼</span>;
  return <span className="sort-indicator inactive">⇅</span>;
}

export function TableHeaderCell({
  field,
  sortDirection,
  width,
  onSort,
  onRename,
  onDelete,
  onResizeStart,
}: TableHeaderCellProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative",
    zIndex: isDragging ? 1 : undefined,
    width: width ? `${width}px` : undefined,
    minWidth: width ? `${width}px` : undefined,
    maxWidth: width ? `${width}px` : undefined,
  };

  return (
    <th ref={setNodeRef} style={style}>
      <div className="header-cell-content">
        <button
          className="column-drag-handle"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder column"
          tabIndex={-1}
        >
          <GripVertical size={13} />
        </button>
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
      {onResizeStart && (
        <div
          className="col-resize-handle"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onResizeStart(e, field.id);
          }}
        />
      )}
    </th>
  );
}
