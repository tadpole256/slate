import type { AppField, FieldOption, RecordRow } from "../../types/slate";

interface GalleryViewProps {
  fields: AppField[];
  records: RecordRow[];
  fieldOptionsByField: Record<string, FieldOption[]>;
  selectedRecordId: string | null;
  onSelectRecord: (recordId: string) => void;
}

function formatCellValue(field: AppField, value: string | number | null | undefined, options: FieldOption[]): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.field_type === "checkbox") return value ? "✓" : "✗";
  if (field.field_type === "rating") return "★".repeat(Number(value));
  if (field.field_type === "currency") return `$${Number(value).toFixed(2)}`;
  if (field.field_type === "percent") return `${value}%`;
  if (field.field_type === "duration") {
    const secs = Number(value);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  if (field.field_type === "single_select") {
    const opt = options.find((o) => o.label === String(value));
    return opt ? opt.label : String(value);
  }
  if (field.field_type === "multi_select") {
    return String(value).split(",").filter(Boolean).join(", ");
  }
  return String(value);
}

export function GalleryView({
  fields,
  records,
  fieldOptionsByField,
  selectedRecordId,
  onSelectRecord,
}: GalleryViewProps) {
  const primaryField = fields.find((f) => f.is_primary_label === 1) ?? fields[0] ?? null;
  const bodyFields = fields.filter((f) => f.id !== primaryField?.id);

  if (fields.length === 0) {
    return (
      <div className="gallery-empty">
        <p>No visible fields.</p>
      </div>
    );
  }

  return (
    <div className="gallery-grid">
      {records.map((record) => {
        const titleValue = primaryField ? record.values[primaryField.column_key] : null;
        const title = titleValue !== null && titleValue !== undefined && titleValue !== ""
          ? String(titleValue)
          : "Untitled";

        return (
          <div
            key={record.record_id}
            className={`gallery-card${record.record_id === selectedRecordId ? " selected" : ""}`}
            onClick={() => onSelectRecord(record.record_id)}
          >
            <div className="gallery-card-title">{title}</div>
            {bodyFields.slice(0, 5).map((field) => {
              const raw = record.values[field.column_key];
              const options = fieldOptionsByField[field.id] ?? [];
              const display = formatCellValue(field, raw, options);
              return (
                <div key={field.id} className="gallery-card-row">
                  <span className="gallery-card-label">{field.display_name}</span>
                  <span className="gallery-card-value">{display}</span>
                </div>
              );
            })}
            {bodyFields.length > 5 && (
              <div className="gallery-card-more">+{bodyFields.length - 5} more</div>
            )}
          </div>
        );
      })}

      {records.length === 0 && (
        <div className="gallery-empty">
          <p>No records. Add a row to get started.</p>
        </div>
      )}
    </div>
  );
}

