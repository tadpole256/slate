import { isComputedFieldType } from "../../types/slate";
import type { AppField, FieldOption, RecordRow } from "../../types/slate";

interface TableCellProps {
  field: AppField;
  row: RecordRow;
  fieldOptions: FieldOption[];
  isFocused?: boolean;
  onChange: (value: string | number | null) => void;
  onOpenLink: (value: string) => void;
}

function toStr(value: string | number | null): string {
  return value === null || value === undefined ? "" : String(value);
}

function RatingCell({ value, onChange }: { value: string | number | null; onChange: (v: number) => void }) {
  const current = Number(value ?? 0);
  return (
    <td className="table-cell rating-cell">
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`star-btn${star <= current ? " filled" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onChange(star === current ? 0 : star);
            }}
          >
            ★
          </button>
        ))}
      </div>
    </td>
  );
}

function SingleSelectCell({
  value,
  options,
  onChange,
}: {
  value: string | number | null;
  options: FieldOption[];
  onChange: (v: string | null) => void;
}) {
  const strVal = toStr(value);
  const opt = options.find((o) => o.label === strVal);
  return (
    <td className="table-cell">
      <div className="select-cell-wrap">
        {opt ? (
          <span className="select-chip" style={{ backgroundColor: opt.color }}>
            {opt.label}
          </span>
        ) : null}
        <select
          className="select-cell-overlay"
          value={strVal}
          onChange={(e) => onChange(e.target.value || null)}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">—</option>
          {options.map((o) => (
            <option key={o.id} value={o.label}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </td>
  );
}

function MultiSelectCell({
  value,
  options,
}: {
  value: string | number | null;
  options: FieldOption[];
}) {
  const strVal = toStr(value);
  const labels = strVal ? strVal.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return (
    <td className="table-cell">
      <div className="multi-chip-row">
        {labels.map((label) => {
          const opt = options.find((o) => o.label === label);
          return (
            <span
              key={label}
              className="select-chip"
              style={{ backgroundColor: opt?.color ?? "#e0e0e0" }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </td>
  );
}

export function TableCell({ field, row, fieldOptions, isFocused, onChange, onOpenLink }: TableCellProps) {
  const rawValue = row.values[field.column_key] ?? null;
  const stringValue = toStr(rawValue);
  const focusClass = isFocused ? " cell-focused" : "";

  // Computed fields are always read-only
  if (isComputedFieldType(field.field_type)) {
    return (
      <td className={`table-cell computed-cell${focusClass}`}>
        <span className="computed-cell-value">{stringValue}</span>
      </td>
    );
  }

  if (field.field_type === "checkbox") {
    return (
      <td className={`table-cell checkbox-cell${focusClass}`}>
        <input
          type="checkbox"
          checked={Number(rawValue) === 1}
          onChange={(e) => onChange(e.target.checked ? 1 : 0)}
        />
      </td>
    );
  }

  if (field.field_type === "rating") {
    return (
      <RatingCell
        value={rawValue}
        onChange={onChange}
      />
    );
  }

  if (field.field_type === "date") {
    return (
      <td className="table-cell">
        <input
          className="grid-input"
          type="date"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
        />
      </td>
    );
  }

  if (field.field_type === "long_text") {
    return (
      <td className="table-cell">
        <textarea
          className="grid-textarea"
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          rows={1}
        />
      </td>
    );
  }

  if (field.field_type === "link" || field.field_type === "url") {
    const canOpen = Boolean(stringValue.trim());
    return (
      <td className="table-cell">
        <div className="link-input-wrap">
          <input
            className="grid-input"
            type="url"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="https://..."
          />
          <button
            className="link-open-button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenLink(stringValue);
            }}
            disabled={!canOpen}
          >
            ↗
          </button>
        </div>
      </td>
    );
  }

  if (field.field_type === "email") {
    return (
      <td className="table-cell">
        <div className="link-input-wrap">
          <input
            className="grid-input"
            type="email"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="user@example.com"
          />
          {stringValue.trim() ? (
            <button
              className="link-open-button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLink(`mailto:${stringValue}`);
              }}
            >
              ✉
            </button>
          ) : null}
        </div>
      </td>
    );
  }

  if (field.field_type === "phone") {
    return (
      <td className="table-cell">
        <div className="link-input-wrap">
          <input
            className="grid-input"
            type="tel"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="+1 555 000 0000"
          />
          {stringValue.trim() ? (
            <button
              className="link-open-button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLink(`tel:${stringValue}`);
              }}
            >
              ☎
            </button>
          ) : null}
        </div>
      </td>
    );
  }

  if (field.field_type === "number" || field.field_type === "duration") {
    return (
      <td className="table-cell">
        <input
          className="grid-input number-input"
          type="number"
          value={stringValue}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : Number(v));
          }}
        />
      </td>
    );
  }

  if (field.field_type === "currency") {
    return (
      <td className="table-cell">
        <div className="number-prefix-wrap">
          <span className="number-prefix">$</span>
          <input
            className="grid-input number-input"
            type="number"
            step="0.01"
            value={stringValue}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === "" ? null : Number(v));
            }}
          />
        </div>
      </td>
    );
  }

  if (field.field_type === "percent") {
    return (
      <td className="table-cell">
        <div className="number-prefix-wrap">
          <input
            className="grid-input number-input"
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={stringValue}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === "" ? null : Number(v));
            }}
          />
          <span className="number-suffix">%</span>
        </div>
      </td>
    );
  }

  if (field.field_type === "single_select") {
    return (
      <SingleSelectCell
        value={rawValue}
        options={fieldOptions}
        onChange={onChange}
      />
    );
  }

  if (field.field_type === "multi_select") {
    return (
      <MultiSelectCell
        value={rawValue}
        options={fieldOptions}
      />
    );
  }

  return (
    <td className={`table-cell${focusClass}`}>
      <input
        className="grid-input"
        type="text"
        value={stringValue}
        onChange={(e) => onChange(e.target.value)}
      />
    </td>
  );
}
