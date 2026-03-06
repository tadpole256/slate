import type { AppField, AppTable, RecordRow } from "../../types/slate";
import { EmptyState } from "../common/EmptyState";
import { TableGrid } from "./TableGrid";
import { TableToolbar } from "./TableToolbar";

interface MainTableViewProps {
  table: AppTable | null;
  fields: AppField[];
  records: RecordRow[];
  selectedRecordId: string | null;
  onSelectRecord: (recordId: string) => void;
  onCellChange: (recordId: string, columnKey: string, value: string | number | null) => void;
  onOpenLink: (value: string) => void;
  onAddColumn: () => void;
  onAddRow: () => void;
  onRenameField: (field: AppField) => void;
  onDeleteField: (field: AppField) => void;
}

export function MainTableView({
  table,
  fields,
  records,
  selectedRecordId,
  onSelectRecord,
  onCellChange,
  onOpenLink,
  onAddColumn,
  onAddRow,
  onRenameField,
  onDeleteField
}: MainTableViewProps) {
  if (!table) {
    return <EmptyState title="Select a table" message="Choose a table from the sidebar to continue." />;
  }

  return (
    <div className="main-table-view">
      <TableToolbar table={table} recordCount={records.length} onAddColumn={onAddColumn} />

      <TableGrid
        fields={fields}
        records={records}
        selectedRecordId={selectedRecordId}
        onSelectRecord={onSelectRecord}
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
