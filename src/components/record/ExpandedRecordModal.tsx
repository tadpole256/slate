import { useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import type { AppField, FieldOption, RecordRow } from "../../types/slate";
import { FieldEditor } from "./FieldEditor";

interface ExpandedRecordModalProps {
  record: RecordRow;
  fields: AppField[];
  fieldOptionsByField: Record<string, FieldOption[]>;
  onFieldChange: (columnKey: string, value: string | number | null) => void;
  onClose: () => void;
  onDelete: () => void;
  onOpenLink: (value: string) => void;
  onCreateFieldOption: (fieldId: string, label: string) => Promise<void>;
}

export function ExpandedRecordModal({
  record,
  fields,
  fieldOptionsByField,
  onFieldChange,
  onClose,
  onDelete,
  onOpenLink,
  onCreateFieldOption,
}: ExpandedRecordModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleDelete() {
    onDelete();
    onClose();
  }

  return (
    <div className="expanded-modal-overlay" onClick={handleOverlayClick}>
      <div className="expanded-modal" role="dialog" aria-modal="true">
        <div className="expanded-modal-header">
          <h3>Record Detail</h3>
          <div className="expanded-modal-header-actions">
            <button
              className="icon-button danger"
              type="button"
              onClick={handleDelete}
              title="Delete record"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={onClose}
              title="Close"
              aria-label="Close expanded record"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="expanded-modal-body">
          <div className="expanded-modal-fields">
            {fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                value={record.values[field.column_key] ?? null}
                fieldOptions={fieldOptionsByField[field.id] ?? []}
                onChange={(value) => onFieldChange(field.column_key, value)}
                onOpenLink={onOpenLink}
                onCreateFieldOption={onCreateFieldOption}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
