import { useState } from "react";
import { CalendarDays, ClipboardList, Columns, GalleryHorizontal, LayoutGrid } from "lucide-react";
import type { ViewType } from "../../types/slate";

const VIEW_TYPES: Array<{ type: ViewType; label: string; desc: string; icon: React.ReactNode }> = [
  {
    type: "grid",
    label: "Grid",
    desc: "Spreadsheet-style rows and columns",
    icon: <LayoutGrid size={20} />,
  },
  {
    type: "gallery",
    label: "Gallery",
    desc: "Cards for each record",
    icon: <GalleryHorizontal size={20} />,
  },
  {
    type: "kanban",
    label: "Kanban",
    desc: "Columns grouped by a select field",
    icon: <Columns size={20} />,
  },
  {
    type: "calendar",
    label: "Calendar",
    desc: "Records on a month grid by date",
    icon: <CalendarDays size={20} />,
  },
  {
    type: "form",
    label: "Form",
    desc: "Distraction-free entry form for new records",
    icon: <ClipboardList size={20} />,
  },
];

interface AddViewModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, viewType: ViewType) => void;
}

export function AddViewModal({ open, onClose, onSubmit }: AddViewModalProps) {
  const [name, setName] = useState("");
  const [selectedType, setSelectedType] = useState<ViewType>("grid");

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, selectedType);
    setName("");
    setSelectedType("grid");
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Add View</h3>

        <div className="field-type-groups">
          {VIEW_TYPES.map((vt) => (
            <button
              key={vt.type}
              type="button"
              className={`view-type-option${selectedType === vt.type ? " selected" : ""}`}
              onClick={() => setSelectedType(vt.type)}
            >
              <span className="view-type-icon">{vt.icon}</span>
              <span className="view-type-label">{vt.label}</span>
              <span className="view-type-desc">{vt.desc}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <input
            className="modal-input"
            placeholder="View name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div className="modal-actions">
            <button type="button" className="action-button secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="action-button primary" disabled={!name.trim()}>
              Create View
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
