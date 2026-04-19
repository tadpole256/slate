import { useState } from "react";
import { ChevronRight, FolderOpen, Pencil, Trash2 } from "lucide-react";
import type { AppFolder, AppTable } from "../../types/slate";
import { TableListItem } from "./TableListItem";

interface FolderListItemProps {
  folder: AppFolder;
  tables: AppTable[];
  activeTableId: string | null;
  folders: AppFolder[];
  onSelectTable: (tableId: string) => void;
  onRenameTable: (tableId: string, currentName: string) => void;
  onDeleteTable: (tableId: string, currentName: string) => void;
  onRenameFolder: () => void;
  onDeleteFolder: () => void;
  onMoveTableToFolder: (tableId: string, folderId: string | null) => void;
}

export function FolderListItem({
  folder,
  tables,
  activeTableId,
  folders,
  onSelectTable,
  onRenameTable,
  onDeleteTable,
  onRenameFolder,
  onDeleteFolder,
  onMoveTableToFolder,
}: FolderListItemProps) {
  const storageKey = `slate-folder-collapsed-${folder.id}`;
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(storageKey) === "1"
  );

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    if (next) {
      localStorage.setItem(storageKey, "1");
    } else {
      localStorage.removeItem(storageKey);
    }
  }

  return (
    <div className={`folder-list-item ${collapsed ? "collapsed" : "open"}`}>
      <div className="folder-header">
        <button
          className="folder-toggle-btn"
          onClick={toggleCollapsed}
          aria-label={`${collapsed ? "Expand" : "Collapse"} folder ${folder.name}`}
        >
          <ChevronRight size={13} className={`folder-chevron ${collapsed ? "" : "open"}`} />
          <FolderOpen size={13} />
          <span className="folder-name">{folder.name}</span>
        </button>
        <div className="folder-actions">
          <button
            className="icon-button"
            onClick={onRenameFolder}
            aria-label="Rename folder"
            title="Rename folder"
          >
            <Pencil size={13} />
          </button>
          <button
            className="icon-button danger"
            onClick={onDeleteFolder}
            aria-label="Delete folder"
            title="Delete folder (tables are kept)"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="folder-table-list">
          {tables.length === 0 ? (
            <p className="folder-empty-hint">No tables</p>
          ) : (
            tables.map((table) => (
              <TableListItem
                key={table.id}
                table={table}
                active={table.id === activeTableId}
                folders={folders}
                onSelect={() => onSelectTable(table.id)}
                onRename={() => onRenameTable(table.id, table.display_name)}
                onDelete={() => onDeleteTable(table.id, table.display_name)}
                onMoveToFolder={(folderId) => onMoveTableToFolder(table.id, folderId)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
