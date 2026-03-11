import { useState } from "react";
import { CalendarDays, ClipboardList, Columns, GalleryHorizontal, LayoutGrid, Pencil, Plus, Trash2 } from "lucide-react";
import type { AppView, ViewType } from "../../types/slate";

interface ViewTabsBarProps {
  views: AppView[];
  activeViewId: string | null;
  onSelectView: (viewId: string) => void;
  onAddView: () => void;
  onRenameView: (viewId: string, currentName: string) => void;
  onDeleteView: (viewId: string) => void;
}

function ViewIcon({ type }: { type: ViewType }) {
  if (type === "gallery") return <GalleryHorizontal size={13} />;
  if (type === "kanban") return <Columns size={13} />;
  if (type === "calendar") return <CalendarDays size={13} />;
  if (type === "form") return <ClipboardList size={13} />;
  return <LayoutGrid size={13} />;
}

export function ViewTabsBar({
  views,
  activeViewId,
  onSelectView,
  onAddView,
  onRenameView,
  onDeleteView,
}: ViewTabsBarProps) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  function handleContextMenu(e: React.MouseEvent, viewId: string) {
    e.preventDefault();
    setMenuOpenId(menuOpenId === viewId ? null : viewId);
  }

  return (
    <div className="view-tabs-bar">
      {views.map((view) => (
        <div key={view.id} className="view-tab-wrap">
          <button
            className={`view-tab${view.id === activeViewId ? " active" : ""}`}
            onClick={() => {
              setMenuOpenId(null);
              onSelectView(view.id);
            }}
            onContextMenu={(e) => handleContextMenu(e, view.id)}
            title={view.view_type}
          >
            <ViewIcon type={view.view_type} />
            <span>{view.name}</span>
          </button>

          {view.id === activeViewId && (
            <button
              className="view-tab-menu-btn"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenId(menuOpenId === view.id ? null : view.id);
              }}
              aria-label="View options"
            >
              ···
            </button>
          )}

          {menuOpenId === view.id && (
            <>
              <div
                className="view-tab-backdrop"
                onClick={() => setMenuOpenId(null)}
              />
              <div className="view-tab-menu">
                <button
                  className="view-tab-menu-item"
                  onClick={() => {
                    setMenuOpenId(null);
                    onRenameView(view.id, view.name);
                  }}
                >
                  <Pencil size={12} /> Rename
                </button>
                {views.length > 1 && (
                  <button
                    className="view-tab-menu-item danger"
                    onClick={() => {
                      setMenuOpenId(null);
                      onDeleteView(view.id);
                    }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      <button className="view-tab-add" onClick={onAddView} title="Add view">
        <Plus size={13} />
        Add view
      </button>
    </div>
  );
}
