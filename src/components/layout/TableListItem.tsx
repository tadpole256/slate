import { useEffect, useRef, useState } from "react";
import { Database, FolderInput, Pencil, Trash2, Unplug } from "lucide-react";
import type { AppFolder, AppTable } from "../../types/slate";

interface TableListItemProps {
  table: AppTable;
  active: boolean;
  folders?: AppFolder[];
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDisconnect?: () => void;
  onMoveToFolder?: (folderId: string | null) => void;
}

export function TableListItem({
  table,
  active,
  folders,
  onSelect,
  onRename,
  onDelete,
  onDisconnect,
  onMoveToFolder,
}: TableListItemProps) {
  const isExternal = table.is_external !== 0;
  const [folderPopoverOpen, setFolderPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!folderPopoverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setFolderPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [folderPopoverOpen]);

  return (
    <div className={`table-list-item ${active ? "active" : ""} ${isExternal ? "external" : ""}`}>
      <button className="table-select" onClick={onSelect}>
        {isExternal && <Database size={12} className="external-table-icon" />}
        {table.display_name}
      </button>
      <div className="table-item-actions">
        {isExternal ? (
          <button
            className="icon-button danger"
            onClick={onDisconnect}
            aria-label={`Disconnect ${table.display_name}`}
            title="Disconnect external database"
          >
            <Unplug size={14} />
          </button>
        ) : (
          <>
            {folders && folders.length > 0 && onMoveToFolder && (
              <div className="move-folder-popover-wrap" ref={popoverRef}>
                <button
                  className="icon-button"
                  onClick={() => setFolderPopoverOpen((v) => !v)}
                  aria-label="Move to folder"
                  title="Move to folder"
                >
                  <FolderInput size={14} />
                </button>
                {folderPopoverOpen && (
                  <div className="move-folder-popover">
                    {folders.map((f) => (
                      <button
                        key={f.id}
                        className={`move-folder-option${table.folder_id === f.id ? " active" : ""}`}
                        onClick={() => {
                          onMoveToFolder(table.folder_id === f.id ? null : f.id);
                          setFolderPopoverOpen(false);
                        }}
                      >
                        {f.name}
                      </button>
                    ))}
                    {table.folder_id && (
                      <button
                        className="move-folder-option remove"
                        onClick={() => {
                          onMoveToFolder(null);
                          setFolderPopoverOpen(false);
                        }}
                      >
                        Remove from folder
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
            <button className="icon-button" onClick={onRename} aria-label={`Rename ${table.display_name}`}>
              <Pencil size={14} />
            </button>
            <button className="icon-button danger" onClick={onDelete} aria-label={`Delete ${table.display_name}`}>
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
