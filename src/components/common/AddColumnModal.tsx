import { useState } from "react";
import type { FieldType } from "../../types/slate";
import { Modal } from "./Modal";

const FIELD_TYPE_OPTIONS: Array<{ label: string; value: FieldType }> = [
  { label: "Single-line text", value: "text" },
  { label: "Long text", value: "long_text" },
  { label: "Date", value: "date" },
  { label: "Checkbox", value: "checkbox" }
];

interface AddColumnModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, fieldType: FieldType) => void;
}

export function AddColumnModal({ open, onClose, onSubmit }: AddColumnModalProps) {
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");

  return (
    <Modal open={open} title="Add Column" onClose={onClose}>
      <div className="modal-body">
        <label className="modal-field">
          <span>Column name</span>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Email"
          />
        </label>

        <label className="modal-field">
          <span>Type</span>
          <select value={fieldType} onChange={(event) => setFieldType(event.target.value as FieldType)}>
            {FIELD_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="action-button"
            onClick={() => {
              onSubmit(name, fieldType);
              setName("");
              setFieldType("text");
            }}
          >
            Add Column
          </button>
        </div>
      </div>
    </Modal>
  );
}
