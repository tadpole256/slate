import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import type { FieldOption, RecordDetailPayload } from "../../types/slate";
import {
  createFieldOption,
  deleteRecord,
  getRecordDetail,
  updateRecord,
} from "../../lib/tauri";
import { FieldEditor } from "./FieldEditor";

interface RecordDetailWindowProps {
  tableId: string;
  recordId: string;
}

export function RecordDetailWindow({ tableId, recordId }: RecordDetailWindowProps) {
  const [payload, setPayload] = useState<RecordDetailPayload | null>(null);
  const [fieldOptions, setFieldOptions] = useState<Record<string, FieldOption[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRecordDetail(tableId, recordId)
      .then((p) => {
        setPayload(p);
        setFieldOptions(p.field_options);
      })
      .catch((err) => {
        setError(String(err));
      });
  }, [tableId, recordId]);

  async function handleFieldChange(columnKey: string, value: string | number | null) {
    if (!payload) return;
    try {
      const updated = await updateRecord({
        table_id: tableId,
        record_id: recordId,
        values: { [columnKey]: value },
      });
      setPayload((prev) => prev ? { ...prev, record: updated } : prev);
    } catch (err) {
      console.error("Failed to update record:", err);
    }
  }

  async function handleCreateFieldOption(fieldId: string, label: string) {
    const option = await createFieldOption(fieldId, label);
    setFieldOptions((prev) => ({
      ...prev,
      [fieldId]: [...(prev[fieldId] ?? []), option],
    }));
  }

  async function handleDelete() {
    try {
      await deleteRecord(tableId, recordId);
      window.close();
    } catch (err) {
      console.error("Failed to delete record:", err);
    }
  }

  function handleOpenLink(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
    window.open(hasScheme ? trimmed : `https://${trimmed}`, "_blank", "noopener,noreferrer");
  }

  if (error) {
    return (
      <div className="record-window">
        <div style={{ padding: "2rem", color: "var(--danger)" }}>
          Failed to load record: {error}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="record-window">
        <div style={{ padding: "2rem", color: "var(--text-secondary)" }}>Loading…</div>
      </div>
    );
  }

  const { table, fields, record } = payload;
  const primaryField = fields.find((f) => f.is_primary_label === 1) ?? fields[0];
  const primaryValue = primaryField
    ? String(record.values[primaryField.column_key] ?? "")
    : "";

  return (
    <div className="record-window">
      <div className="record-window-header">
        <div className="record-window-header-left">
          <span className="record-window-table-label">{table.display_name}</span>
          <h1 className="record-window-primary">{primaryValue || "Untitled"}</h1>
        </div>
        <div className="record-window-header-actions">
          <button
            className="icon-button danger"
            type="button"
            onClick={handleDelete}
            title="Delete record"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="record-window-body">
        {fields
          .filter((f) => f.is_visible !== 0)
          .map((field) => (
            <FieldEditor
              key={field.id}
              field={field}
              value={record.values[field.column_key] ?? null}
              fieldOptions={fieldOptions[field.id] ?? []}
              onChange={(value) => void handleFieldChange(field.column_key, value)}
              onOpenLink={handleOpenLink}
              onCreateFieldOption={handleCreateFieldOption}
            />
          ))}
      </div>
    </div>
  );
}
