import { useEffect, useMemo, useState } from "react";
import { ArrowRightCircle, Link2, Trash2 } from "lucide-react";
import type {
  AppField,
  AppTable,
  FieldOption,
  RecordAttachment,
  RecordLink,
  RecordOption,
  RecordRow
} from "../../types/slate";
import { EmptyState } from "../common/EmptyState";
import { FieldEditor } from "./FieldEditor";

interface RecordDetailPanelProps {
  table: AppTable | null;
  fields: AppField[];
  selectedRecord: RecordRow | null;
  onFieldChange: (columnKey: string, value: string | number | null) => void;
  tables: AppTable[];
  links: RecordLink[];
  linksLoading: boolean;
  recordOptionsByTable: Record<string, RecordOption[]>;
  recordOptionsLoading: boolean;
  onLoadRecordOptions: (tableId: string, query?: string) => void;
  onCreateRecordLink: (toTableId: string, toRecordId: string) => void;
  onDeleteRecordLink: (linkId: string) => void;
  onOpenLinkedRecord: (toTableId: string, toRecordId: string) => void;
  attachments: RecordAttachment[];
  attachmentsLoading: boolean;
  onAttachFile: () => void;
  onOpenAttachment: (attachmentId: string) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onOpenLink: (value: string) => void;
  onDeleteRecord: () => void;
  fieldOptionsByField: Record<string, FieldOption[]>;
  onCreateFieldOption: (fieldId: string, label: string) => Promise<void>;
}

export function RecordDetailPanel({
  table,
  fields,
  selectedRecord,
  onFieldChange,
  tables,
  links,
  linksLoading,
  recordOptionsByTable,
  recordOptionsLoading,
  onLoadRecordOptions,
  onCreateRecordLink,
  onDeleteRecordLink,
  onOpenLinkedRecord,
  attachments,
  attachmentsLoading,
  onAttachFile,
  onOpenAttachment,
  onDeleteAttachment,
  onOpenLink,
  onDeleteRecord,
  fieldOptionsByField,
  onCreateFieldOption,
}: RecordDetailPanelProps) {
  const [targetTableId, setTargetTableId] = useState("");
  const [targetRecordId, setTargetRecordId] = useState("");

  const tableChoices = useMemo(() => tables, [tables]);

  useEffect(() => {
    if (!table) {
      return;
    }

    if (tableChoices.length === 0) {
      setTargetTableId("");
      return;
    }

    const exists = tableChoices.some((item) => item.id === targetTableId);
    if (!exists) {
      const fallback = tableChoices.find((item) => item.id !== table.id)?.id ?? tableChoices[0]?.id ?? "";
      setTargetTableId(fallback);
    }
  }, [tableChoices, targetTableId, table]);

  useEffect(() => {
    if (!targetTableId) {
      return;
    }
    onLoadRecordOptions(targetTableId);
  }, [targetTableId, onLoadRecordOptions]);

  const targetOptions = targetTableId ? recordOptionsByTable[targetTableId] ?? [] : [];

  useEffect(() => {
    if (!targetOptions.length) {
      setTargetRecordId("");
      return;
    }

    if (!targetOptions.some((option) => option.record_id === targetRecordId)) {
      setTargetRecordId(targetOptions[0]?.record_id ?? "");
    }
  }, [targetOptions, targetRecordId]);

  const linkingToSelf = Boolean(
    table &&
      selectedRecord &&
      targetTableId === table.id &&
      targetRecordId === selectedRecord.record_id
  );

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
            fieldOptions={fieldOptionsByField[field.id] ?? []}
            onChange={(value) => onFieldChange(field.column_key, value)}
            onOpenLink={onOpenLink}
            onCreateFieldOption={onCreateFieldOption}
          />
        ))}

        <section className="linked-records-section">
          <div className="linked-records-header">
            <h4>Linked Records</h4>
          </div>

          <div className="linked-records-create">
            <label className="modal-field">
              <span>Table</span>
              <select
                value={targetTableId}
                onChange={(event) => {
                  setTargetTableId(event.target.value);
                  setTargetRecordId("");
                }}
              >
                {tableChoices.map((tableChoice) => (
                  <option key={tableChoice.id} value={tableChoice.id}>
                    {tableChoice.display_name}
                  </option>
                ))}
              </select>
            </label>

            <label className="modal-field">
              <span>Record</span>
              <select
                value={targetRecordId}
                onChange={(event) => setTargetRecordId(event.target.value)}
                disabled={!targetOptions.length}
              >
                {targetOptions.length === 0 ? (
                  <option value="">No records available</option>
                ) : (
                  targetOptions.map((option) => (
                    <option key={option.record_id} value={option.record_id}>
                      {option.label}
                    </option>
                  ))
                )}
              </select>
            </label>

            <button
              className="action-button secondary"
              type="button"
              disabled={!targetTableId || !targetRecordId || linkingToSelf}
              onClick={() => onCreateRecordLink(targetTableId, targetRecordId)}
            >
              <Link2 size={14} />
              Link Record
            </button>
          </div>

          {recordOptionsLoading ? <p className="attachments-note">Loading target records...</p> : null}
          {linkingToSelf ? (
            <p className="attachments-note">A record cannot link to itself.</p>
          ) : null}

          {linksLoading ? <p className="attachments-note">Loading linked records...</p> : null}

          {!linksLoading && links.length === 0 ? (
            <p className="attachments-note">No linked records yet.</p>
          ) : null}

          {links.map((link) => (
            <div key={link.id} className="attachment-row">
              <div className="attachment-meta">
                <strong>{link.to_record_label}</strong>
                <small>{link.to_table_name}</small>
              </div>

              <div className="attachment-actions">
                <button
                  className="ghost-button"
                  onClick={() => onOpenLinkedRecord(link.to_table_id, link.to_record_id)}
                  type="button"
                >
                  <ArrowRightCircle size={14} />
                  Open
                </button>
                <button
                  className="icon-button danger"
                  onClick={() => onDeleteRecordLink(link.id)}
                  type="button"
                  aria-label={`Remove link to ${link.to_record_label}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className="attachments-section">
          <div className="attachments-header">
            <h4>Attachments</h4>
            <button className="action-button secondary" onClick={onAttachFile} type="button">
              Attach File
            </button>
          </div>

          {attachmentsLoading ? <p className="attachments-note">Loading attachments...</p> : null}

          {!attachmentsLoading && attachments.length === 0 ? (
            <p className="attachments-note">No attachments yet.</p>
          ) : null}

          {attachments.map((attachment) => (
            <div key={attachment.id} className="attachment-row">
              <div className="attachment-meta">
                <strong>{attachment.file_name}</strong>
                <small>
                  {attachment.size_bytes ? `${Math.max(1, Math.round(attachment.size_bytes / 1024))} KB` : "Unknown size"}
                </small>
              </div>

              <div className="attachment-actions">
                <button
                  className="ghost-button"
                  onClick={() => onOpenAttachment(attachment.id)}
                  type="button"
                >
                  Open
                </button>
                <button
                  className="icon-button danger"
                  onClick={() => onDeleteAttachment(attachment.id)}
                  type="button"
                  aria-label={`Delete ${attachment.file_name}`}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
