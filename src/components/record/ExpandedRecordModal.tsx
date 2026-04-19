import { useEffect, useRef, useState } from "react";
import { Send, Trash2, X } from "lucide-react";
import type { AppField, FieldOption, RecordNote, RecordRow } from "../../types/slate";
import { createRecordNote, deleteRecordNote, listRecordNotes } from "../../lib/tauri";
import { FieldEditor } from "./FieldEditor";

interface ExpandedRecordModalProps {
  record: RecordRow;
  tableId: string;
  fields: AppField[];
  fieldOptionsByField: Record<string, FieldOption[]>;
  onFieldChange: (columnKey: string, value: string | number | null) => void;
  onClose: () => void;
  onDelete: () => void;
  onOpenLink: (value: string) => void;
  onCreateFieldOption: (fieldId: string, label: string) => Promise<void>;
}

export function ExpandedRecordModal({
  record,
  tableId,
  fields,
  fieldOptionsByField,
  onFieldChange,
  onClose,
  onDelete,
  onOpenLink,
  onCreateFieldOption,
}: ExpandedRecordModalProps) {
  const [notes, setNotes] = useState<RecordNote[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [noteSubmitting, setNoteSubmitting] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listRecordNotes(tableId, record.record_id).then(setNotes).catch(() => {});
  }, [tableId, record.record_id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleDelete() {
    onDelete();
    onClose();
  }

  async function handleAddNote() {
    const body = noteInput.trim();
    if (!body || noteSubmitting) return;
    setNoteSubmitting(true);
    try {
      const note = await createRecordNote(tableId, record.record_id, body);
      setNotes((prev) => [...prev, note]);
      setNoteInput("");
    } catch {
      // swallow — user will see nothing added
    } finally {
      setNoteSubmitting(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    try {
      await deleteRecordNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {
      // swallow
    }
  }

  function handleNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleAddNote();
    }
  }

  return (
    <div className="expanded-modal-overlay" onClick={handleOverlayClick}>
      <div className="expanded-modal" role="dialog" aria-modal="true">
        <div className="expanded-modal-header">
          <h3>Record Detail</h3>
          <div className="expanded-modal-header-actions">
            <button
              className="icon-button danger"
              type="button"
              onClick={handleDelete}
              title="Delete record"
            >
              <Trash2 size={14} />
              Delete
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={onClose}
              title="Close"
              aria-label="Close expanded record"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="expanded-modal-body">
          <div className="expanded-modal-fields">
            {fields.map((field) => (
              <FieldEditor
                key={field.id}
                field={field}
                value={record.values[field.column_key] ?? null}
                fieldOptions={fieldOptionsByField[field.id] ?? []}
                onChange={(value) => onFieldChange(field.column_key, value)}
                onOpenLink={onOpenLink}
                onCreateFieldOption={onCreateFieldOption}
              />
            ))}
          </div>

          <div className="record-notes-section">
            <div className="record-notes-title">Notes</div>

            <div className="record-notes-list">
              {notes.length === 0 && (
                <p className="record-notes-empty">No notes yet.</p>
              )}
              {notes.map((note) => (
                <div key={note.id} className="record-note-item">
                  <p className="record-note-body">{note.body}</p>
                  <div className="record-note-meta">
                    <span className="record-note-time">
                      {new Date(note.created_at).toLocaleString()}
                    </span>
                    <button
                      className="icon-button danger small"
                      title="Delete note"
                      onClick={() => void handleDeleteNote(note.id)}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="record-note-input-row">
              <textarea
                ref={inputRef}
                className="record-note-input"
                placeholder="Add a note… (Cmd+Enter to submit)"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={handleNoteKeyDown}
                rows={2}
              />
              <button
                className="icon-button primary"
                title="Add note"
                disabled={!noteInput.trim() || noteSubmitting}
                onClick={() => void handleAddNote()}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
