import type { AppField, FieldOption, RecordRow } from "../../types/slate";

interface KanbanViewProps {
  fields: AppField[];
  records: RecordRow[];
  fieldOptionsByField: Record<string, FieldOption[]>;
  selectedRecordId: string | null;
  groupByFieldId: string | null;
  onSelectRecord: (recordId: string) => void;
  onSetGroupByField: (fieldId: string) => void;
}

export function KanbanView({
  fields,
  records,
  fieldOptionsByField,
  selectedRecordId,
  groupByFieldId,
  onSelectRecord,
  onSetGroupByField,
}: KanbanViewProps) {
  const selectFields = fields.filter((f) => f.field_type === "single_select");
  const primaryField = fields.find((f) => f.is_primary_label === 1) ?? fields[0] ?? null;

  const resolvedGroupField =
    selectFields.find((f) => f.id === groupByFieldId) ?? selectFields[0] ?? null;

  if (selectFields.length === 0) {
    return (
      <div className="kanban-empty-state">
        <p>Kanban view requires a <strong>Single Select</strong> field.</p>
        <p>Add one via the <em>Column</em> button above.</p>
      </div>
    );
  }

  const groupOptions: Array<FieldOption | null> = [
    null,
    ...(fieldOptionsByField[resolvedGroupField?.id ?? ""] ?? []),
  ];

  function recordLabel(record: RecordRow): string {
    if (!primaryField) return record.record_id.slice(0, 8);
    const v = record.values[primaryField.column_key];
    return v !== null && v !== undefined && v !== "" ? String(v) : "Untitled";
  }

  function recordGroup(record: RecordRow): string | null {
    if (!resolvedGroupField) return null;
    const v = record.values[resolvedGroupField.column_key];
    return v !== null && v !== undefined && v !== "" ? String(v) : null;
  }

  return (
    <div className="kanban-wrap">
      {selectFields.length > 1 && (
        <div className="kanban-group-picker">
          <label>Group by:</label>
          <select
            value={resolvedGroupField?.id ?? ""}
            onChange={(e) => onSetGroupByField(e.target.value)}
          >
            {selectFields.map((f) => (
              <option key={f.id} value={f.id}>{f.display_name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="kanban-board">
        {groupOptions.map((opt) => {
          const colLabel = opt ? opt.label : "No value";
          const colRecords = records.filter((r) => {
            const g = recordGroup(r);
            return opt ? g === opt.label : g === null;
          });

          return (
            <div key={opt?.id ?? "__none__"} className="kanban-column">
              <div className="kanban-column-header">
                {opt && (
                  <span
                    className="kanban-option-chip"
                    style={{ background: optionColor(opt.color) }}
                  />
                )}
                <span className="kanban-column-label">{colLabel}</span>
                <span className="kanban-column-count">{colRecords.length}</span>
              </div>

              <div className="kanban-cards">
                {colRecords.map((record) => (
                  <div
                    key={record.record_id}
                    className={`kanban-card${record.record_id === selectedRecordId ? " selected" : ""}`}
                    onClick={() => onSelectRecord(record.record_id)}
                  >
                    {recordLabel(record)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function optionColor(color: string): string {
  const map: Record<string, string> = {
    default: "#4b5563",
    red: "#dc2626",
    orange: "#ea580c",
    yellow: "#ca8a04",
    green: "#16a34a",
    blue: "#2563eb",
    purple: "#7c3aed",
    pink: "#db2777",
    gray: "#6b7280",
  };
  return map[color] ?? map["default"]!;
}
