import { Plus } from "lucide-react";
import type { AppTable } from "../../types/slate";
import { EmptyState } from "../common/EmptyState";
import { TableList } from "./TableList";

interface SidebarProps {
  tables: AppTable[];
  activeTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onAddTable: () => void;
  onRenameTable: (tableId: string, currentName: string) => void;
  onDeleteTable: (tableId: string, currentName: string) => void;
}

export function Sidebar({
  tables,
  activeTableId,
  onSelectTable,
  onAddTable,
  onRenameTable,
  onDeleteTable
}: SidebarProps) {
  return (
    <div className="sidebar-content">
      <div className="sidebar-header">
        <h2>Tables</h2>
      </div>

      {tables.length === 0 ? (
        <EmptyState title="No tables" message="Create your first table to start organizing records." />
      ) : (
        <TableList
          tables={tables}
          activeTableId={activeTableId}
          onSelect={onSelectTable}
          onRename={onRenameTable}
          onDelete={onDeleteTable}
        />
      )}

      <button className="ghost-button" onClick={onAddTable}>
        <Plus size={14} />
        New Table
      </button>
    </div>
  );
}
