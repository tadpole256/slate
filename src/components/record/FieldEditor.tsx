import { isComputedFieldType } from "../../types/slate";
import type { AppField, FieldOption } from "../../types/slate";
import { SingleSelectEditor, MultiSelectEditor } from "./SelectFieldEditor";

interface FieldEditorProps {
  field: AppField;
  value: string | number | null;
  fieldOptions: FieldOption[];
  onChange: (value: string | number | null) => void;
  onOpenLink: (value: string) => void;
  onCreateFieldOption: (fieldId: string, label: string) => Promise<void>;
}

function toStr(value: string | number | null): string {
  return value === null || value === undefined ? "" : String(value);
}

function RatingEditor({ value, onChange }: { value: string | number | null; onChange: (v: number) => void }) {
  const current = Number(value ?? 0);
  return (
    <div className="rating-stars large">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-btn${star <= current ? " filled" : ""}`}
          onClick={() => onChange(star === current ? 0 : star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function FieldEditor({ field, value, fieldOptions, onChange, onOpenLink, onCreateFieldOption }: FieldEditorProps) {
  const stringValue = toStr(value);

  // Computed fields are read-only; render a simple display instead of an input
  if (isComputedFieldType(field.field_type)) {
    return (
      <div className="field-editor field-editor--computed">
        <span>{field.display_name}</span>
        <div className="computed-field-value">{stringValue || "—"}</div>
      </div>
    );
  }

  return (
    <label className="field-editor">
      <span>{field.display_name}</span>

      {field.field_type === "text" ? (
        <input type="text" value={stringValue} onChange={(e) => onChange(e.target.value)} />
      ) : null}

      {field.field_type === "long_text" ? (
        <textarea value={stringValue} onChange={(e) => onChange(e.target.value)} rows={5} />
      ) : null}

      {field.field_type === "date" ? (
        <input type="date" value={stringValue} onChange={(e) => onChange(e.target.value)} />
      ) : null}

      {field.field_type === "checkbox" ? (
        <input
          type="checkbox"
          checked={Number(value ?? 0) === 1}
          onChange={(e) => onChange(e.target.checked ? 1 : 0)}
        />
      ) : null}

      {field.field_type === "link" || field.field_type === "url" ? (
        <div className="link-detail-wrap">
          <input
            type="url"
            value={stringValue}
            placeholder="https://..."
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            className="action-button secondary link-detail-button"
            onClick={() => onOpenLink(stringValue)}
            disabled={!stringValue.trim()}
            type="button"
          >
            Open Link
          </button>
        </div>
      ) : null}

      {field.field_type === "email" ? (
        <div className="link-detail-wrap">
          <input
            type="email"
            value={stringValue}
            placeholder="user@example.com"
            onChange={(e) => onChange(e.target.value)}
          />
          {stringValue.trim() ? (
            <button
              className="action-button secondary link-detail-button"
              onClick={() => onOpenLink(`mailto:${stringValue}`)}
              type="button"
            >
              Send Email
            </button>
          ) : null}
        </div>
      ) : null}

      {field.field_type === "phone" ? (
        <div className="link-detail-wrap">
          <input
            type="tel"
            value={stringValue}
            placeholder="+1 555 000 0000"
            onChange={(e) => onChange(e.target.value)}
          />
          {stringValue.trim() ? (
            <button
              className="action-button secondary link-detail-button"
              onClick={() => onOpenLink(`tel:${stringValue}`)}
              type="button"
            >
              Call
            </button>
          ) : null}
        </div>
      ) : null}

      {field.field_type === "number" || field.field_type === "duration" ? (
        <input
          type="number"
          value={stringValue}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? null : Number(v));
          }}
        />
      ) : null}

      {field.field_type === "currency" ? (
        <div className="number-prefix-wrap">
          <span className="number-prefix">$</span>
          <input
            type="number"
            step="0.01"
            value={stringValue}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === "" ? null : Number(v));
            }}
          />
        </div>
      ) : null}

      {field.field_type === "percent" ? (
        <div className="number-prefix-wrap">
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={stringValue}
            onChange={(e) => {
              const v = e.target.value;
              onChange(v === "" ? null : Number(v));
            }}
          />
          <span className="number-suffix">%</span>
        </div>
      ) : null}

      {field.field_type === "rating" ? (
        <RatingEditor value={value} onChange={onChange} />
      ) : null}

      {field.field_type === "single_select" ? (
        <SingleSelectEditor
          value={value}
          options={fieldOptions}
          onChange={onChange}
          onCreateOption={(label) => onCreateFieldOption(field.id, label)}
        />
      ) : null}

      {field.field_type === "multi_select" ? (
        <MultiSelectEditor
          value={value}
          options={fieldOptions}
          onChange={onChange}
          onCreateOption={(label) => onCreateFieldOption(field.id, label)}
        />
      ) : null}
    </label>
  );
}
