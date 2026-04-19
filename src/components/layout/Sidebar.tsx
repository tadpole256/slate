import { FolderPlus, HardDriveDownload, Plus } from "lucide-react";
import type { AppFolder, AppTable } from "../../types/slate";
import { EmptyState } from "../common/EmptyState";
import { FolderListItem } from "./FolderListItem";
import { TableList } from "./TableList";

interface SidebarProps {
  tables: AppTable[];
  folders: AppFolder[];
  activeTableId: string | null;
  onSelectTable: (tableId: string) => void;
  onAddTable: () => void;
  onRenameTable: (tableId: string, currentName: string) => void;
  onDeleteTable: (tableId: string, currentName: string) => void;
  onConnectDb: () => void;
  onDisconnectTable: (tableId: string) => void;
  onCreateFolder: () => void;
  onRenameFolder: (id: string, currentName: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveTableToFolder: (tableId: string, folderId: string | null) => void;
}

export function Sidebar({
  tables,
  folders,
  activeTableId,
  onSelectTable,
  onAddTable,
  onRenameTable,
  onDeleteTable,
  onConnectDb,
  onDisconnectTable,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveTableToFolder,
}: SidebarProps) {
  const ungrouped = tables.filter((t) => !t.folder_id && t.is_external === 0);
  const external = tables.filter((t) => t.is_external !== 0);
  const internalCount = tables.filter((t) => t.is_external === 0).length;

  return (
    <div className="sidebar-content">
      <div className="sidebar-header">
        <h2>Tables</h2>
      </div>

      {internalCount === 0 && folders.length === 0 ? (
        <EmptyState
          title="No tables"
          message="Create your first table to start organizing records."
        />
      ) : (
        <>
          {/* Ungrouped internal tables */}
          {ungrouped.length > 0 && (
            <TableList
              tables={ungrouped}
              activeTableId={activeTableId}
              folders={folders}
              onSelect={onSelectTable}
              onRename={onRenameTable}
              onDelete={onDeleteTable}
              onDisconnect={onDisconnectTable}
              onMoveToFolder={onMoveTableToFolder}
            />
          )}

          {/* Folder groups */}
          {folders.map((folder) => (
            <FolderListItem
              key={folder.id}
              folder={folder}
              tables={tables.filter((t) => t.folder_id === folder.id)}
              activeTableId={activeTableId}
              folders={folders}
              onSelectTable={onSelectTable}
              onRenameTable={onRenameTable}
              onDeleteTable={onDeleteTable}
              onRenameFolder={() => onRenameFolder(folder.id, folder.name)}
              onDeleteFolder={() => onDeleteFolder(folder.id)}
              onMoveTableToFolder={onMoveTableToFolder}
            />
          ))}

          {/* External tables section */}
          {external.length > 0 && (
            <>
              <div className="sidebar-section-label">External</div>
              <TableList
                tables={external}
                activeTableId={activeTableId}
                onSelect={onSelectTable}
                onRename={onRenameTable}
                onDelete={onDeleteTable}
                onDisconnect={onDisconnectTable}
              />
            </>
          )}
        </>
      )}

      <button className="ghost-button" onClick={onAddTable}>
        <Plus size={14} />
        New Table
      </button>
      <button className="ghost-button" onClick={onCreateFolder}>
        <FolderPlus size={14} />
        New Folder
      </button>
      <button
        className="ghost-button"
        onClick={onConnectDb}
        title="Open an external SQLite database in read-only mode"
      >
        <HardDriveDownload size={14} />
        Connect Database
      </button>
    </div>
  );
}
