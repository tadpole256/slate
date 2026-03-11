import { useState } from "react";
import { isComputedFieldType } from "../../types/slate";
import type { AppField, AppTable, FieldOption } from "../../types/slate";
import { FieldEditor } from "../record/FieldEditor";

interface FormViewProps {
  table: AppTable;
  fields: AppField[];
  fieldOptionsByField: Record<string, FieldOption[]>;
  onSubmit: (values: Record<string, string | number | null>) => Promise<void>;
  onCreateFieldOption: (fieldId: string, label: string) => Promise<void>;
  onOpenLink: (value: string) => void;
}

function buildDefaults(fields: AppField[]): Record<string, string | number | null> {
  const vals: Record<string, string | number | null> = {};
  for (const f of fields) {
    vals[f.column_key] = ["checkbox", "rating", "duration", "number", "currency", "percent"].includes(
      f.field_type
    )
      ? 0
      : "";
  }
  return vals;
}

export function FormView({
  table,
  fields,
  fieldOptionsByField,
  onSubmit,
  onCreateFieldOption,
  onOpenLink,
}: FormViewProps) {
  const editableFields = fields.filter((f) => !isComputedFieldType(f.field_type));

  const [values, setValues] = useState<Record<string, string | number | null>>(() =>
    buildDefaults(editableFields)
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleChange(columnKey: string, value: string | number | null) {
    setValues((prev) => ({ ...prev, [columnKey]: value }));
    if (submitted) setSubmitted(false);
  }

  function handleClear() {
    setValues(buildDefaults(editableFields));
    setSubmitted(false);
    setSubmitError(null);
  }

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit(values);
      setValues(buildDefaults(editableFields));
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="form-view">
      <div className="form-view-card">
        <div className="form-view-header">
          <h2 className="form-view-title">{table.display_name}</h2>
          <p className="form-view-subtitle">Fill out the fields below to add a new record.</p>
        </div>

        <div className="form-view-body">
          {editableFields.map((field) => (
            <FieldEditor
              key={field.id}
              field={field}
              value={values[field.column_key] ?? null}
              fieldOptions={fieldOptionsByField[field.id] ?? []}
              onChange={(val) => handleChange(field.column_key, val)}
              onOpenLink={onOpenLink}
              onCreateFieldOption={onCreateFieldOption}
            />
          ))}
        </div>

        <div className="form-view-actions">
          {submitted && <span className="form-submitted-badge">✓ Record added</span>}
          {submitError && <span className="form-submit-error">{submitError}</span>}
          <button className="ghost-button" onClick={handleClear} disabled={submitting}>
            Clear
          </button>
          <button
            className="action-button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? "Adding…" : "+ Submit Record"}
          </button>
        </div>
      </div>
    </div>
  );
}
