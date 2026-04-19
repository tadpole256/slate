import { Download, EyeOff, Filter, Layers, Plus, Upload } from "lucide-react";
import type { AppField, AppTable, RowHeight } from "../../types/slate";

interface TableToolbarProps {
  table: AppTable | null;
  fields: AppField[];
  hiddenFieldIds: string[];
  recordCount: number;
  filterCount: number;
  showFilterBar: boolean;
  showHidePanel: boolean;
  rowHeight: RowHeight;
  groupByFieldId: string | null;
  selectedCount: number;
  onAddColumn: () => void;
  onToggleFilterBar: () => void;
  onToggleHidePanel: () => void;
  onToggleFieldVisibility: (fieldId: string) => void;
  onSetRowHeight: (height: RowHeight) => void;
  onSetGroupByField: (fieldId: string | null) => void;
  onBulkDelete: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onImportCsv: () => void;
}

export function TableToolbar({
  table,
  fields,
  hiddenFieldIds,
  recordCount,
  filterCount,
  showFilterBar,
  showHidePanel,
  rowHeight,
  groupByFieldId,
  selectedCount,
  onAddColumn,
  onToggleFilterBar,
  onToggleHidePanel,
  onToggleFieldVisibility,
  onSetRowHeight,
  onSetGroupByField,
  onBulkDelete,
  onExportCsv,
  onExportJson,
  onImportCsv,
}: TableToolbarProps) {
  return (
    <div className="table-toolbar-wrap">
      <div className="table-toolbar">
        <div>
          <h2>{table?.display_name ?? "No table selected"}</h2>
          <p>{recordCount} records{selectedCount > 0 ? ` · ${selectedCount} selected` : ""}</p>
        </div>

        <div className="toolbar-actions">
          {selectedCount > 0 && (
            <button
              className="action-button danger"
              onClick={onBulkDelete}
              title={`Delete ${selectedCount} selected record(s)`}
            >
              Delete {selectedCount}
            </button>
          )}

          <button
            className={`action-button secondary${showFilterBar ? " active" : ""}`}
            onClick={onToggleFilterBar}
            disabled={!table}
            title="Filter rows"
          >
            <Filter size={14} />
            Filters{filterCount > 0 ? ` (${filterCount})` : ""}
          </button>

          <button
            className={`action-button secondary${showHidePanel ? " active" : ""}`}
            onClick={onToggleHidePanel}
            disabled={!table}
            title="Show/hide columns"
          >
            <EyeOff size={14} />
            Fields{hiddenFieldIds.length > 0 ? ` (${hiddenFieldIds.length} hidden)` : ""}
          </button>

          {/* Group By selector */}
          <div className="group-by-wrap" title="Group records by field">
            <Layers size={14} className="group-by-icon" />
            <select
              className="group-by-select"
              value={groupByFieldId ?? ""}
              onChange={(e) => onSetGroupByField(e.target.value || null)}
              disabled={!table}
            >
              <option value="">Group by…</option>
              {fields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.display_name}
                </option>
              ))}
            </select>
          </div>

          {/* Row height toggle */}
          <div className="row-height-group" title="Row height">
            {(["compact", "default", "tall"] as RowHeight[]).map((h) => (
              <button
                key={h}
                className={`row-height-btn${rowHeight === h ? " active" : ""}`}
                onClick={() => onSetRowHeight(h)}
                disabled={!table}
                aria-label={`Row height: ${h}`}
                title={`Row height: ${h}`}
              >
                {h === "compact" ? "≡" : h === "default" ? "☰" : "⬛"}
              </button>
            ))}
          </div>

          <button
            className="action-button secondary"
            onClick={onImportCsv}
            disabled={!table}
            title="Import CSV"
          >
            <Upload size={14} />
            Import
          </button>

          <button
            className="action-button secondary"
            onClick={onExportCsv}
            disabled={!table}
            title="Export CSV"
          >
            <Download size={14} />
            CSV
          </button>

          <button
            className="action-button secondary"
            onClick={onExportJson}
            disabled={!table}
            title="Export JSON"
          >
            <Download size={14} />
            JSON
          </button>

          <button className="action-button secondary" onClick={onAddColumn} disabled={!table}>
            <Plus size={15} />
            Column
          </button>
        </div>
      </div>

      {showHidePanel && (
        <div className="hide-fields-panel">
          <p className="hide-fields-title">Show / hide columns</p>
          {fields.map((field) => (
            <label key={field.id} className="hide-field-row">
              <input
                type="checkbox"
                checked={!hiddenFieldIds.includes(field.id)}
                onChange={() => onToggleFieldVisibility(field.id)}
              />
              {field.display_name}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
