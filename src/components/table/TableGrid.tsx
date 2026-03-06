import type { AppField, RecordRow } from "../../types/slate";
import { EmptyState } from "../common/EmptyState";
import { TableCell } from "./TableCell";
import { TableHeaderCell } from "./TableHeaderCell";

interface TableGridProps {
  fields: AppField[];
  records: RecordRow[];
  selectedRecordId: string | null;
  onSelectRecord: (recordId: string) => void;
  onCellChange: (
    recordId: string,
    columnKey: string,
    value: string | number | null
  ) => void;
  onOpenLink: (value: string) => void;
  onRenameField: (field: AppField) => void;
  onDeleteField: (field: AppField) => void;
}

export function TableGrid({
  fields,
  records,
  selectedRecordId,
  onSelectRecord,
  onCellChange,
  onOpenLink,
  onRenameField,
  onDeleteField
}: TableGridProps) {
  if (!fields.length) {
    return <EmptyState title="No columns" message="Add a column to start collecting data." />;
  }

  return (
    <div className="table-grid-wrap">
      <table className="table-grid">
        <thead>
          <tr>
            {fields.map((field) => (
              <TableHeaderCell
                key={field.id}
                field={field}
                onRename={onRenameField}
                onDelete={onDeleteField}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((row) => (
            <tr
              key={row.record_id}
              className={selectedRecordId === row.record_id ? "active-row" : ""}
              onClick={() => onSelectRecord(row.record_id)}
            >
              {fields.map((field) => (
                <TableCell
                  key={`${row.record_id}:${field.id}`}
                  field={field}
                  row={row}
                  onChange={(value) => onCellChange(row.record_id, field.column_key, value)}
                  onOpenLink={onOpenLink}
                />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {!records.length ? (
        <EmptyState title="No records yet" message="Add a record to populate this table." />
      ) : null}
    </div>
  );
}
