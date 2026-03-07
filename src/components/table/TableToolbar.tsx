import { EyeOff, Filter, Plus } from "lucide-react";
import type { AppField, AppTable } from "../../types/slate";

interface TableToolbarProps {
  table: AppTable | null;
  fields: AppField[];
  hiddenFieldIds: string[];
  recordCount: number;
  filterCount: number;
  showFilterBar: boolean;
  showHidePanel: boolean;
  onAddColumn: () => void;
  onToggleFilterBar: () => void;
  onToggleHidePanel: () => void;
  onToggleFieldVisibility: (fieldId: string) => void;
}

export function TableToolbar({
  table,
  fields,
  hiddenFieldIds,
  recordCount,
  filterCount,
  showFilterBar,
  showHidePanel,
  onAddColumn,
  onToggleFilterBar,
  onToggleHidePanel,
  onToggleFieldVisibility,
}: TableToolbarProps) {
  return (
    <div className="table-toolbar-wrap">
      <div className="table-toolbar">
        <div>
          <h2>{table?.display_name ?? "No table selected"}</h2>
          <p>{recordCount} records</p>
        </div>

        <div className="toolbar-actions">
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
