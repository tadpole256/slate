import { useState } from "react";
import type { FieldType } from "../../types/slate";
import { Modal } from "./Modal";

interface FieldTypeOption {
  label: string;
  value: FieldType;
  desc: string;
}

const FIELD_TYPE_GROUPS: Array<{ group: string; types: FieldTypeOption[] }> = [
  {
    group: "Text",
    types: [
      { label: "Text", value: "text", desc: "Single line of text" },
      { label: "Long text", value: "long_text", desc: "Multi-line text" },
      { label: "Email", value: "email", desc: "Email address" },
      { label: "Phone", value: "phone", desc: "Phone number" },
      { label: "URL", value: "url", desc: "Web address" },
    ],
  },
  {
    group: "Number",
    types: [
      { label: "Number", value: "number", desc: "Integer or decimal" },
      { label: "Currency", value: "currency", desc: "Monetary value" },
      { label: "Percent", value: "percent", desc: "Percentage value" },
      { label: "Rating", value: "rating", desc: "Star rating (0–5)" },
      { label: "Duration", value: "duration", desc: "Time in seconds" },
    ],
  },
  {
    group: "Date",
    types: [
      { label: "Date", value: "date", desc: "Calendar date" },
    ],
  },
  {
    group: "Selection",
    types: [
      { label: "Single select", value: "single_select", desc: "One option from a list" },
      { label: "Multi select", value: "multi_select", desc: "Multiple options from a list" },
    ],
  },
  {
    group: "Toggle",
    types: [
      { label: "Checkbox", value: "checkbox", desc: "True or false" },
    ],
  },
];

interface AddColumnModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, fieldType: FieldType) => void;
}

export function AddColumnModal({ open, onClose, onSubmit }: AddColumnModalProps) {
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSubmit(trimmed, fieldType);
    setName("");
    setFieldType("text");
  }

  return (
    <Modal open={open} title="Add Column" onClose={onClose}>
      <div className="modal-body">
        <label className="modal-field">
          <span>Column name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="e.g. Status"
          />
        </label>

        <div className="modal-field">
          <span>Field type</span>
          <div className="field-type-groups">
            {FIELD_TYPE_GROUPS.map((group) => (
              <div key={group.group} className="field-type-group">
                <div className="field-type-group-label">{group.group}</div>
                <div className="field-type-grid">
                  {group.types.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`field-type-option${fieldType === opt.value ? " selected" : ""}`}
                      onClick={() => setFieldType(opt.value)}
                    >
                      <span className="field-type-option-label">{opt.label}</span>
                      <span className="field-type-option-desc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button className="action-button" onClick={handleSubmit} disabled={!name.trim()}>
            Add Column
          </button>
        </div>
      </div>
    </Modal>
  );
}
