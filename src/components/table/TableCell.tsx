import type { AppField, RecordRow } from "../../types/slate";

interface TableCellProps {
  field: AppField;
  row: RecordRow;
  onChange: (value: string | number | null) => void;
  onOpenLink: (value: string) => void;
}

function toInputValue(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export function TableCell({ field, row, onChange, onOpenLink }: TableCellProps) {
  const rawValue = row.values[field.column_key] ?? null;
  const stringValue = toInputValue(rawValue);

  if (field.field_type === "checkbox") {
    const checked = Number(rawValue) === 1;
    return (
      <td className="table-cell checkbox-cell">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked ? 1 : 0)} />
      </td>
    );
  }

  if (field.field_type === "date") {
    return (
      <td className="table-cell">
        <input
          className="grid-input"
          type="date"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
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
          onChange={(event) => onChange(event.target.value)}
          rows={1}
        />
      </td>
    );
  }

  if (field.field_type === "link") {
    const canOpen = Boolean(stringValue.trim());
    return (
      <td className="table-cell">
        <div className="link-input-wrap">
          <input
            className="grid-input"
            type="url"
            value={stringValue}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://..."
          />
          <button
            className="link-open-button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenLink(stringValue);
            }}
            disabled={!canOpen}
          >
            Open
          </button>
        </div>
      </td>
    );
  }

  return (
    <td className="table-cell">
      <input
        className="grid-input"
        type="text"
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
      />
    </td>
  );
}
