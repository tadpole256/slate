import type { AppField, RecordRow } from "../../types/slate";

interface TableCellProps {
  field: AppField;
  row: RecordRow;
  onChange: (value: string | number | null) => void;
}

function toInputValue(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export function TableCell({ field, row, onChange }: TableCellProps) {
  const rawValue = row.values[field.column_key] ?? null;

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
          value={toInputValue(rawValue)}
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
          value={toInputValue(rawValue)}
          onChange={(event) => onChange(event.target.value)}
          rows={1}
        />
      </td>
    );
  }

  return (
    <td className="table-cell">
      <input
        className="grid-input"
        type="text"
        value={toInputValue(rawValue)}
        onChange={(event) => onChange(event.target.value)}
      />
    </td>
  );
}
