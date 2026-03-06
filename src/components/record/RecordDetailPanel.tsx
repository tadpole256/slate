import { Trash2 } from "lucide-react";
import type { AppField, AppTable, RecordRow } from "../../types/slate";
import { EmptyState } from "../common/EmptyState";
import { FieldEditor } from "./FieldEditor";

interface RecordDetailPanelProps {
  table: AppTable | null;
  fields: AppField[];
  selectedRecord: RecordRow | null;
  onFieldChange: (columnKey: string, value: string | number | null) => void;
  onDeleteRecord: () => void;
}

export function RecordDetailPanel({
  table,
  fields,
  selectedRecord,
  onFieldChange,
  onDeleteRecord
}: RecordDetailPanelProps) {
  if (!table) {
    return <EmptyState title="Record" message="Select a table to inspect records." />;
  }

  if (!selectedRecord) {
    return <EmptyState title="Record" message="Click a row to edit it in detail." />;
  }

  return (
    <div className="record-detail-content">
      <div className="record-detail-header">
        <h3>Record</h3>
        <button className="icon-button danger" onClick={onDeleteRecord}>
          <Trash2 size={14} />
          Delete
        </button>
      </div>

      <div className="record-fields">
        {fields.map((field) => (
          <FieldEditor
            key={field.id}
            field={field}
            value={selectedRecord.values[field.column_key] ?? null}
            onChange={(value) => onFieldChange(field.column_key, value)}
          />
        ))}
      </div>
    </div>
  );
}
