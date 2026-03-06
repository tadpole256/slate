import { Trash2 } from "lucide-react";
import type { AppField, AppTable, RecordAttachment, RecordRow } from "../../types/slate";
import { EmptyState } from "../common/EmptyState";
import { FieldEditor } from "./FieldEditor";

interface RecordDetailPanelProps {
  table: AppTable | null;
  fields: AppField[];
  selectedRecord: RecordRow | null;
  onFieldChange: (columnKey: string, value: string | number | null) => void;
  attachments: RecordAttachment[];
  attachmentsLoading: boolean;
  onAttachFile: () => void;
  onOpenAttachment: (attachmentId: string) => void;
  onDeleteAttachment: (attachmentId: string) => void;
  onOpenLink: (value: string) => void;
  onDeleteRecord: () => void;
}

export function RecordDetailPanel({
  table,
  fields,
  selectedRecord,
  onFieldChange,
  attachments,
  attachmentsLoading,
  onAttachFile,
  onOpenAttachment,
  onDeleteAttachment,
  onOpenLink,
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
            onOpenLink={onOpenLink}
          />
        ))}

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
