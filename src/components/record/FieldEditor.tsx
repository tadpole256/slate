import type { AppField } from "../../types/slate";

interface FieldEditorProps {
  field: AppField;
  value: string | number | null;
  onChange: (value: string | number | null) => void;
}

function valueToString(value: string | number | null): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

export function FieldEditor({ field, value, onChange }: FieldEditorProps) {
  const stringValue = valueToString(value);

  return (
    <label className="field-editor">
      <span>{field.display_name}</span>

      {field.field_type === "long_text" ? (
        <textarea value={stringValue} onChange={(event) => onChange(event.target.value)} rows={5} />
      ) : null}

      {field.field_type === "date" ? (
        <input
          type="date"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}

      {field.field_type === "checkbox" ? (
        <input
          type="checkbox"
          checked={Number(value ?? 0) === 1}
          onChange={(event) => onChange(event.target.checked ? 1 : 0)}
        />
      ) : null}

      {(field.field_type === "text" || field.field_type === "link") ? (
        <input type="text" value={stringValue} onChange={(event) => onChange(event.target.value)} />
      ) : null}
    </label>
  );
}
