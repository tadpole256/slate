import { useState } from "react";
import type { AppField, AppTable, FieldType } from "../../types/slate";
import { Modal } from "./Modal";

interface FieldTypeOption {
  label: string;
  value: FieldType;
  desc: string;
}

const FIELD_TYPE_GROUPS: Array<{ group: string; types: FieldTypeOption[] }> = [
  {
    group: "Text",
    types: [
      { label: "Text", value: "text", desc: "Single line of text" },
      { label: "Long text", value: "long_text", desc: "Multi-line text" },
      { label: "Email", value: "email", desc: "Email address" },
      { label: "Phone", value: "phone", desc: "Phone number" },
      { label: "URL", value: "url", desc: "Web address" },
    ],
  },
  {
    group: "Number",
    types: [
      { label: "Number", value: "number", desc: "Integer or decimal" },
      { label: "Currency", value: "currency", desc: "Monetary value" },
      { label: "Percent", value: "percent", desc: "Percentage value" },
      { label: "Rating", value: "rating", desc: "Star rating (0–5)" },
      { label: "Duration", value: "duration", desc: "Time in seconds" },
    ],
  },
  {
    group: "Date",
    types: [
      { label: "Date", value: "date", desc: "Calendar date" },
    ],
  },
  {
    group: "Selection",
    types: [
      { label: "Single select", value: "single_select", desc: "One option from a list" },
      { label: "Multi select", value: "multi_select", desc: "Multiple options from a list" },
      { label: "Tags", value: "tags", desc: "Free-form labels as pills" },
    ],
  },
  {
    group: "Toggle",
    types: [
      { label: "Checkbox", value: "checkbox", desc: "True or false" },
    ],
  },
  {
    group: "Computed",
    types: [
      { label: "Lookup", value: "lookup", desc: "Show a value from a linked record" },
      { label: "Rollup", value: "rollup", desc: "Aggregate values from linked records" },
      { label: "Formula", value: "formula", desc: "Calculate a value from other fields" },
    ],
  },
];

const ROLLUP_FUNCTIONS = ["COUNT", "SUM", "AVG", "MIN", "MAX"] as const;
type RollupFn = typeof ROLLUP_FUNCTIONS[number];

interface AddColumnModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, fieldType: FieldType, computedConfig?: string) => void;
  tables?: AppTable[];
  fieldsByTable?: Record<string, AppField[]>;
  currentTableId?: string;
}

export function AddColumnModal({
  open,
  onClose,
  onSubmit,
  tables = [],
  fieldsByTable = {},
  currentTableId,
}: AddColumnModalProps) {
  const [name, setName] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");

  // Computed field config state
  const [targetTableId, setTargetTableId] = useState("");
  const [targetFieldId, setTargetFieldId] = useState("");
  const [rollupFn, setRollupFn] = useState<RollupFn>("COUNT");
  const [formulaExpression, setFormulaExpression] = useState("");

  const isComputed = fieldType === "lookup" || fieldType === "rollup" || fieldType === "formula";

  // Non-computed fields of the current table for formula chip insertion
  const currentTableFields = (currentTableId ? fieldsByTable[currentTableId] ?? [] : []).filter(
    (f) => f.field_type !== "lookup" && f.field_type !== "rollup" && f.field_type !== "formula"
  );

  // Fields of the selected target table
  const targetTableFields = targetTableId ? (fieldsByTable[targetTableId] ?? []).filter(
    (f) => f.field_type !== "lookup" && f.field_type !== "rollup" && f.field_type !== "formula"
  ) : [];

  function resetComputedState() {
    setTargetTableId("");
    setTargetFieldId("");
    setRollupFn("COUNT");
    setFormulaExpression("");
  }

  function handleFieldTypeChange(ft: FieldType) {
    setFieldType(ft);
    resetComputedState();
  }

  function buildComputedConfig(): string | undefined {
    if (fieldType === "lookup") {
      return JSON.stringify({ targetTableId, targetFieldId });
    }
    if (fieldType === "rollup") {
      return JSON.stringify({ targetTableId, targetFieldId, fn: rollupFn });
    }
    if (fieldType === "formula") {
      return JSON.stringify({ expression: formulaExpression });
    }
    return undefined;
  }

  function isSubmitDisabled(): boolean {
    if (!name.trim()) return true;
    if (fieldType === "lookup") return !targetTableId || !targetFieldId;
    if (fieldType === "rollup") return !targetTableId || !targetFieldId;
    if (fieldType === "formula") return !formulaExpression.trim();
    return false;
  }

  function handleSubmit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const config = buildComputedConfig();
    onSubmit(trimmed, fieldType, config);
    setName("");
    setFieldType("text");
    resetComputedState();
  }

  return (
    <Modal open={open} title="Add Column" onClose={onClose}>
      <div className="modal-body">
        <label className="modal-field">
          <span>Column name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isSubmitDisabled() && handleSubmit()}
            placeholder="e.g. Status"
          />
        </label>

        <div className="modal-field">
          <span>Field type</span>
          <div className="field-type-groups">
            {FIELD_TYPE_GROUPS.map((group) => (
              <div key={group.group} className="field-type-group">
                <div className="field-type-group-label">{group.group}</div>
                <div className="field-type-grid">
                  {group.types.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`field-type-option${fieldType === opt.value ? " selected" : ""}`}
                      onClick={() => handleFieldTypeChange(opt.value)}
                    >
                      <span className="field-type-option-label">{opt.label}</span>
                      <span className="field-type-option-desc">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Computed field config UI */}
        {isComputed && (
          <div className="computed-config-section">
            {(fieldType === "lookup" || fieldType === "rollup") && (
              <>
                <label className="modal-field">
                  <span>Linked table</span>
                  <select
                    value={targetTableId}
                    onChange={(e) => { setTargetTableId(e.target.value); setTargetFieldId(""); }}
                  >
                    <option value="">— Select table —</option>
                    {tables
                      .filter((t) => t.id !== currentTableId)
                      .map((t) => (
                        <option key={t.id} value={t.id}>{t.display_name}</option>
                      ))}
                  </select>
                </label>
                <label className="modal-field">
                  <span>Field to {fieldType === "rollup" ? "aggregate" : "show"}</span>
                  <select
                    value={targetFieldId}
                    onChange={(e) => setTargetFieldId(e.target.value)}
                    disabled={!targetTableId}
                  >
                    <option value="">— Select field —</option>
                    {targetTableFields.map((f) => (
                      <option key={f.id} value={f.id}>{f.display_name}</option>
                    ))}
                  </select>
                </label>
                {fieldType === "rollup" && (
                  <label className="modal-field">
                    <span>Aggregate function</span>
                    <select value={rollupFn} onChange={(e) => setRollupFn(e.target.value as RollupFn)}>
                      {ROLLUP_FUNCTIONS.map((fn) => (
                        <option key={fn} value={fn}>{fn}</option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}

            {fieldType === "formula" && (
              <>
                <label className="modal-field">
                  <span>Expression</span>
                  <textarea
                    className="formula-textarea"
                    value={formulaExpression}
                    onChange={(e) => setFormulaExpression(e.target.value)}
                    placeholder="e.g. col_abc * col_def"
                    rows={3}
                  />
                </label>
                {currentTableFields.length > 0 && (
                  <div className="modal-field">
                    <span>Insert field</span>
                    <div className="field-insert-chips">
                      {currentTableFields.map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          className="field-insert-chip"
                          onClick={() => setFormulaExpression((prev) => prev + f.column_key)}
                        >
                          {f.display_name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button className="action-button" onClick={handleSubmit} disabled={isSubmitDisabled()}>
            Add Column
          </button>
        </div>
      </div>
    </Modal>
  );
}
