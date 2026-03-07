import { useState } from "react";
import type { FieldOption } from "../../types/slate";

interface SingleSelectEditorProps {
  value: string | number | null;
  options: FieldOption[];
  onChange: (v: string | null) => void;
  onCreateOption: (label: string) => Promise<void>;
}

export function SingleSelectEditor({ value, options, onChange, onCreateOption }: SingleSelectEditorProps) {
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const strVal = value === null || value === undefined ? "" : String(value);

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    await onCreateOption(label);
    onChange(label);
    setNewLabel("");
    setAdding(false);
  }

  return (
    <div className="select-editor">
      <div className="select-chip-list">
        <button
          type="button"
          className={`select-chip selectable${strVal === "" ? " selected-opt" : ""}`}
          style={{ backgroundColor: "#e0e0e0" }}
          onClick={() => onChange(null)}
        >
          None
        </button>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`select-chip selectable${strVal === opt.label ? " selected-opt" : ""}`}
            style={{ backgroundColor: opt.color }}
            onClick={() => onChange(opt.label)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {adding ? (
        <div className="select-add-row">
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Option label..."
          />
          <button type="button" className="action-button" onClick={handleAdd}>Add</button>
          <button type="button" className="ghost-button" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="ghost-button select-add-btn" onClick={() => setAdding(true)}>
          + Add option
        </button>
      )}
    </div>
  );
}

interface MultiSelectEditorProps {
  value: string | number | null;
  options: FieldOption[];
  onChange: (v: string | null) => void;
  onCreateOption: (label: string) => Promise<void>;
}

export function MultiSelectEditor({ value, options, onChange, onCreateOption }: MultiSelectEditorProps) {
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const strVal = value === null || value === undefined ? "" : String(value);
  const selected = strVal ? strVal.split(",").map((s) => s.trim()).filter(Boolean) : [];

  function toggle(label: string) {
    const next = selected.includes(label)
      ? selected.filter((l) => l !== label)
      : [...selected, label];
    onChange(next.length ? next.join(", ") : null);
  }

  async function handleAdd() {
    const label = newLabel.trim();
    if (!label) return;
    await onCreateOption(label);
    toggle(label);
    setNewLabel("");
    setAdding(false);
  }

  return (
    <div className="select-editor">
      <div className="select-chip-list">
        {options.map((opt) => {
          const isSelected = selected.includes(opt.label);
          return (
            <button
              key={opt.id}
              type="button"
              className={`select-chip selectable${isSelected ? " selected-opt" : ""}`}
              style={{ backgroundColor: opt.color }}
              onClick={() => toggle(opt.label)}
            >
              {isSelected ? "✓ " : ""}{opt.label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="multi-selected-display">
          <span className="field-editor-hint">Selected: </span>
          {selected.map((label) => {
            const opt = options.find((o) => o.label === label);
            return (
              <span key={label} className="select-chip" style={{ backgroundColor: opt?.color ?? "#e0e0e0" }}>
                {label}
              </span>
            );
          })}
        </div>
      )}
      {adding ? (
        <div className="select-add-row">
          <input
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") setAdding(false); }}
            placeholder="Option label..."
          />
          <button type="button" className="action-button" onClick={handleAdd}>Add</button>
          <button type="button" className="ghost-button" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : (
        <button type="button" className="ghost-button select-add-btn" onClick={() => setAdding(true)}>
          + Add option
        </button>
      )}
    </div>
  );
}
