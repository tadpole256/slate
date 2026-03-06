import type { AppTable } from "../../types/slate";
import { TableListItem } from "./TableListItem";

interface TableListProps {
  tables: AppTable[];
  activeTableId: string | null;
  onSelect: (tableId: string) => void;
  onRename: (tableId: string, currentName: string) => void;
  onDelete: (tableId: string, currentName: string) => void;
}

export function TableList({
  tables,
  activeTableId,
  onSelect,
  onRename,
  onDelete
}: TableListProps) {
  return (
    <div className="table-list">
      {tables.map((table) => (
        <TableListItem
          key={table.id}
          table={table}
          active={table.id === activeTableId}
          onSelect={() => onSelect(table.id)}
          onRename={() => onRename(table.id, table.display_name)}
          onDelete={() => onDelete(table.id, table.display_name)}
        />
      ))}
    </div>
  );
}
