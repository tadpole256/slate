import { Trash2 } from "lucide-react";
import type { AppField, FilterInput, FilterOp } from "../../types/slate";

const TEXT_OPS: Array<{ label: string; value: FilterOp }> = [
  { label: "contains", value: "contains" },
  { label: "does not contain", value: "not_contains" },
  { label: "is", value: "eq" },
  { label: "is not", value: "neq" },
  { label: "is empty", value: "is_empty" },
  { label: "is not empty", value: "is_not_empty" },
];

const NUM_OPS: Array<{ label: string; value: FilterOp }> = [
  { label: "=", value: "eq" },
  { label: "≠", value: "neq" },
  { label: ">", value: "gt" },
  { label: "<", value: "lt" },
  { label: "≥", value: "gte" },
  { label: "≤", value: "lte" },
  { label: "is empty", value: "is_empty" },
  { label: "is not empty", value: "is_not_empty" },
];

function opsForField(field: AppField) {
  const numericTypes = ["number", "currency", "percent", "rating", "duration"];
  return numericTypes.includes(field.field_type) ? NUM_OPS : TEXT_OPS;
}

function valueRequired(op: FilterOp): boolean {
  return op !== "is_empty" && op !== "is_not_empty";
}

interface FilterBarProps {
  fields: AppField[];
  filters: FilterInput[];
  onChange: (filters: FilterInput[]) => void;
}

export function FilterBar({ fields, filters, onChange }: FilterBarProps) {
  const visibleFields = fields.filter((f) => f.is_visible !== 0);

  function addFilter() {
    const field = visibleFields[0];
    if (!field) return;
    onChange([...filters, { field_id: field.id, op: "contains", value: "" }]);
  }

  function updateFilter(index: number, patch: Partial<FilterInput>) {
    const next = filters.map((f, i) => (i === index ? { ...f, ...patch } : f));
    onChange(next);
  }

  function removeFilter(index: number) {
    onChange(filters.filter((_, i) => i !== index));
  }

  return (
    <div className="filter-bar">
      <div className="filter-bar-rows">
        {filters.map((filter, idx) => {
          const field = fields.find((f) => f.id === filter.field_id);
          const ops = field ? opsForField(field) : TEXT_OPS;
          const needsValue = valueRequired(filter.op);

          return (
            <div key={idx} className="filter-row">
              <select
                value={filter.field_id}
                onChange={(e) => {
                  const newField = fields.find((f) => f.id === e.target.value);
                  const newOp = newField ? opsForField(newField)[0].value : "contains";
                  updateFilter(idx, { field_id: e.target.value, op: newOp, value: "" });
                }}
              >
                {visibleFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.display_name}
                  </option>
                ))}
              </select>

              <select
                value={filter.op}
                onChange={(e) => updateFilter(idx, { op: e.target.value as FilterOp, value: "" })}
              >
                {ops.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>

              {needsValue ? (
                <input
                  className="filter-value-input"
                  value={filter.value ?? ""}
                  placeholder="Value..."
                  onChange={(e) => updateFilter(idx, { value: e.target.value })}
                />
              ) : (
                <span className="filter-value-empty" />
              )}

              <button
                className="icon-button danger"
                onClick={() => removeFilter(idx)}
                aria-label="Remove filter"
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <button className="ghost-button filter-add-btn" onClick={addFilter} disabled={!visibleFields.length}>
        + Add filter
      </button>
    </div>
  );
}
