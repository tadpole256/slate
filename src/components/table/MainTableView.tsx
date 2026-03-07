import { useMemo, useState } from "react";
import type { AppField, AppTable, FieldOption, FilterInput, RecordRow, SortInput } from "../../types/slate";
import { EmptyState } from "../common/EmptyState";
import { FilterBar } from "./FilterBar";
import { TableGrid } from "./TableGrid";
import { TableToolbar } from "./TableToolbar";

interface MainTableViewProps {
  table: AppTable | null;
  fields: AppField[];
  records: RecordRow[];
  fieldOptionsByField: Record<string, FieldOption[]>;
  sorts: SortInput[];
  filters: FilterInput[];
  hiddenFieldIds: string[];
  selectedRecordId: string | null;
  onSelectRecord: (recordId: string) => void;
  onCellChange: (recordId: string, columnKey: string, value: string | number | null) => void;
  onOpenLink: (value: string) => void;
  onAddColumn: () => void;
  onAddRow: () => void;
  onRenameField: (field: AppField) => void;
  onDeleteField: (field: AppField) => void;
  onSortsChange: (sorts: SortInput[]) => void;
  onFiltersChange: (filters: FilterInput[]) => void;
  onToggleFieldVisibility: (fieldId: string) => void;
}

export function MainTableView({
  table,
  fields,
  records,
  fieldOptionsByField,
  sorts,
  filters,
  hiddenFieldIds,
  selectedRecordId,
  onSelectRecord,
  onCellChange,
  onOpenLink,
  onAddColumn,
  onAddRow,
  onRenameField,
  onDeleteField,
  onSortsChange,
  onFiltersChange,
  onToggleFieldVisibility,
}: MainTableViewProps) {
  const [showFilterBar, setShowFilterBar] = useState(false);
  const [showHidePanel, setShowHidePanel] = useState(false);

  const visibleFields = useMemo(
    () => fields.filter((f) => !hiddenFieldIds.includes(f.id)),
    [fields, hiddenFieldIds]
  );

  const sortByField = useMemo(
    () =>
      sorts.reduce<Record<string, "asc" | "desc">>((acc, s) => {
        acc[s.field_id] = s.direction;
        return acc;
      }, {}),
    [sorts]
  );

  function handleSortField(field: AppField) {
    const current = sortByField[field.id] ?? null;
    let next: SortInput[];
    if (!current) {
      next = [...sorts, { field_id: field.id, direction: "asc" }];
    } else if (current === "asc") {
      next = sorts.map((s) =>
        s.field_id === field.id ? { ...s, direction: "desc" as const } : s
      );
    } else {
      next = sorts.filter((s) => s.field_id !== field.id);
    }
    onSortsChange(next);
  }

  if (!table) {
    return <EmptyState title="Select a table" message="Choose a table from the sidebar to continue." />;
  }

  return (
    <div className="main-table-view">
      <TableToolbar
        table={table}
        fields={fields}
        hiddenFieldIds={hiddenFieldIds}
        recordCount={records.length}
        filterCount={filters.length}
        showFilterBar={showFilterBar}
        showHidePanel={showHidePanel}
        onAddColumn={onAddColumn}
        onToggleFilterBar={() => setShowFilterBar((v) => !v)}
        onToggleHidePanel={() => setShowHidePanel((v) => !v)}
        onToggleFieldVisibility={onToggleFieldVisibility}
      />

      {showFilterBar && (
        <FilterBar
          fields={visibleFields}
          filters={filters}
          onChange={onFiltersChange}
        />
      )}

      <TableGrid
        fields={visibleFields}
        records={records}
        fieldOptionsByField={fieldOptionsByField}
        sortByField={sortByField}
        selectedRecordId={selectedRecordId}
        onSelectRecord={onSelectRecord}
        onSortField={handleSortField}
        onCellChange={onCellChange}
        onOpenLink={onOpenLink}
        onRenameField={onRenameField}
        onDeleteField={onDeleteField}
      />

      <button className="add-row-bar" onClick={onAddRow}>
        + New Row
      </button>
    </div>
  );
}
