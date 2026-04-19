import type { AppFolder, AppTable } from "../../types/slate";
import { TableListItem } from "./TableListItem";

interface TableListProps {
  tables: AppTable[];
  activeTableId: string | null;
  folders?: AppFolder[];
  onSelect: (tableId: string) => void;
  onRename: (tableId: string, currentName: string) => void;
  onDelete: (tableId: string, currentName: string) => void;
  onDisconnect: (tableId: string) => void;
  onMoveToFolder?: (tableId: string, folderId: string | null) => void;
}

export function TableList({
  tables,
  activeTableId,
  folders,
  onSelect,
  onRename,
  onDelete,
  onDisconnect,
  onMoveToFolder,
}: TableListProps) {
  return (
    <div className="table-list">
      {tables.map((table) => (
        <TableListItem
          key={table.id}
          table={table}
          active={table.id === activeTableId}
          folders={folders}
          onSelect={() => onSelect(table.id)}
          onRename={() => onRename(table.id, table.display_name)}
          onDelete={() => onDelete(table.id, table.display_name)}
          onDisconnect={() => onDisconnect(table.id)}
          onMoveToFolder={
            onMoveToFolder ? (folderId) => onMoveToFolder(table.id, folderId) : undefined
          }
        />
      ))}
    </div>
  );
}
