import { useCallback, useMemo, useRef, useState } from "react";
import type { AppField, FieldOption, RecordRow, RowHeight, SortDirection } from "../../types/slate";
import { EmptyState } from "../common/EmptyState";
import { TableCell } from "./TableCell";
import { TableHeaderCell } from "./TableHeaderCell";

interface TableGridProps {
  fields: AppField[];
  records: RecordRow[];
  fieldOptionsByField: Record<string, FieldOption[]>;
  sortByField: Record<string, SortDirection>;
  selectedRecordId: string | null;
  rowHeight?: RowHeight;
  groupByColumnKey?: string;
  onSelectRecord: (recordId: string) => void;
  onSortField: (field: AppField) => void;
  onCellChange: (
    recordId: string,
    columnKey: string,
    value: string | number | null
  ) => void;
  onOpenLink: (value: string) => void;
  onRenameField: (field: AppField) => void;
  onDeleteField: (field: AppField) => void;
  onDoubleClickRecord?: (recordId: string) => void;
  onSelectionChange?: (ids: Set<string>) => void;
}

export function TableGrid({
  fields,
  records,
  fieldOptionsByField,
  sortByField,
  selectedRecordId,
  rowHeight = "default",
  groupByColumnKey,
  onSelectRecord,
  onSortField,
  onCellChange,
  onOpenLink,
  onRenameField,
  onDeleteField,
  onDoubleClickRecord,
  onSelectionChange,
}: TableGridProps) {
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const lastClickedIdxRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const updateSelection = useCallback((next: Set<string>) => {
    setSelectedIds(next);
    onSelectionChange?.(next);
  }, [onSelectionChange]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === records.length) {
      updateSelection(new Set());
    } else {
      updateSelection(new Set(records.map((r) => r.record_id)));
    }
    lastClickedIdxRef.current = null;
  }, [selectedIds.size, records, updateSelection]);

  const toggleRowCheck = useCallback((recordId: string, shiftKey: boolean, rowIndex: number) => {
    const next = new Set(selectedIds);
    if (shiftKey && lastClickedIdxRef.current !== null) {
      const from = Math.min(lastClickedIdxRef.current, rowIndex);
      const to = Math.max(lastClickedIdxRef.current, rowIndex);
      const shouldSelect = !selectedIds.has(recordId);
      for (let i = from; i <= to; i++) {
        if (records[i]) {
          if (shouldSelect) next.add(records[i].record_id);
          else next.delete(records[i].record_id);
        }
      }
    } else {
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      lastClickedIdxRef.current = rowIndex;
    }
    updateSelection(next);
  }, [selectedIds, records, updateSelection]);

  // Build groups if groupByColumnKey is set
  const groups = useMemo<Array<[string, RecordRow[]]> | null>(() => {
    if (!groupByColumnKey) return null;
    const map = new Map<string, RecordRow[]>();
    for (const record of records) {
      const raw = record.values[groupByColumnKey];
      const val = raw !== null && raw !== undefined ? String(raw) : "";
      if (!map.has(val)) map.set(val, []);
      map.get(val)!.push(record);
    }
    // Sort: non-empty groups alphabetically, empty group last
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (!a && b) return 1;
      if (a && !b) return -1;
      return a.localeCompare(b);
    });
  }, [records, groupByColumnKey]);

  // Flat ordered records for keyboard nav (respects group ordering)
  const orderedRecords = useMemo(() => {
    if (!groups) return records;
    return groups
      .filter(([key]) => !collapsedGroups.has(key))
      .flatMap(([, recs]) => recs);
  }, [groups, records, collapsedGroups]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!orderedRecords.length || !fields.length) return;

      const navKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Escape"];
      if (!navKeys.includes(e.key)) return;

      e.preventDefault();

      if (focusedCell === null) {
        const cell = { rowIndex: 0, colIndex: 0 };
        setFocusedCell(cell);
        onSelectRecord(orderedRecords[0].record_id);
        return;
      }

      const { rowIndex, colIndex } = focusedCell;
      const lastRow = orderedRecords.length - 1;
      const lastCol = fields.length - 1;

      switch (e.key) {
        case "ArrowDown": {
          if (rowIndex < lastRow) {
            const next = { rowIndex: rowIndex + 1, colIndex };
            setFocusedCell(next);
            onSelectRecord(orderedRecords[next.rowIndex].record_id);
          }
          break;
        }
        case "ArrowUp": {
          if (rowIndex > 0) {
            const next = { rowIndex: rowIndex - 1, colIndex };
            setFocusedCell(next);
            onSelectRecord(orderedRecords[next.rowIndex].record_id);
          }
          break;
        }
        case "ArrowRight":
        case "Tab": {
          if (colIndex < lastCol) {
            setFocusedCell({ rowIndex, colIndex: colIndex + 1 });
          } else if (rowIndex < lastRow) {
            const next = { rowIndex: rowIndex + 1, colIndex: 0 };
            setFocusedCell(next);
            onSelectRecord(orderedRecords[next.rowIndex].record_id);
          }
          break;
        }
        case "ArrowLeft": {
          if (colIndex > 0) {
            setFocusedCell({ rowIndex, colIndex: colIndex - 1 });
          } else if (rowIndex > 0) {
            const next = { rowIndex: rowIndex - 1, colIndex: lastCol };
            setFocusedCell(next);
            onSelectRecord(orderedRecords[next.rowIndex].record_id);
          }
          break;
        }
        case "Enter": {
          if (onDoubleClickRecord) {
            onDoubleClickRecord(orderedRecords[rowIndex].record_id);
          }
          break;
        }
        case "Escape": {
          setFocusedCell(null);
          break;
        }
      }
    },
    [focusedCell, orderedRecords, fields, onSelectRecord, onDoubleClickRecord]
  );

  if (!fields.length) {
    return <EmptyState title="No columns" message="Add a column to start collecting data." />;
  }

  const gridClass = [
    "table-grid",
    rowHeight === "compact" ? "grid-compact" : "",
    rowHeight === "tall" ? "grid-tall" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const allChecked = records.length > 0 && selectedIds.size === records.length;
  const someChecked = selectedIds.size > 0 && selectedIds.size < records.length;

  const renderRows = (rowsToRender: RecordRow[], globalOffset: number) =>
    rowsToRender.map((row, localIndex) => {
      const globalRowIndex = globalOffset + localIndex;
      const isSelected = selectedRecordId === row.record_id;
      const isFocusedRow = focusedCell?.rowIndex === globalRowIndex;
      const isChecked = selectedIds.has(row.record_id);
      const rowClass = [
        isSelected ? "active-row" : "",
        isFocusedRow ? "focused-row" : "",
        isChecked ? "checked-row" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <tr
          key={row.record_id}
          className={rowClass || undefined}
          onClick={() => {
            onSelectRecord(row.record_id);
            setFocusedCell({ rowIndex: globalRowIndex, colIndex: focusedCell?.colIndex ?? 0 });
          }}
          onDoubleClick={() => {
            if (onDoubleClickRecord) {
              onDoubleClickRecord(row.record_id);
            }
          }}
        >
          <td
            className="table-cell checkbox-col"
            onClick={(e) => {
              e.stopPropagation();
              toggleRowCheck(row.record_id, e.shiftKey, globalRowIndex);
            }}
          >
            <input
              type="checkbox"
              checked={isChecked}
              onChange={() => {}}
              tabIndex={-1}
            />
          </td>
          {fields.map((field, colIndex) => (
            <TableCell
              key={`${row.record_id}:${field.id}`}
              field={field}
              row={row}
              fieldOptions={fieldOptionsByField[field.id] ?? []}
              isFocused={isFocusedRow && focusedCell?.colIndex === colIndex}
              onChange={(value) => onCellChange(row.record_id, field.column_key, value)}
              onOpenLink={onOpenLink}
            />
          ))}
        </tr>
      );
    });

  return (
    <div
      className="table-grid-wrap"
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onFocus={() => {
        if (focusedCell === null && orderedRecords.length > 0) {
          setFocusedCell({ rowIndex: 0, colIndex: 0 });
        }
      }}
      style={{ outline: "none" }}
    >
      <table className={gridClass}>
        <thead>
          <tr>
            <th className="table-header-cell checkbox-col">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={toggleSelectAll}
                tabIndex={-1}
              />
            </th>
            {fields.map((field) => (
              <TableHeaderCell
                key={field.id}
                field={field}
                sortDirection={sortByField[field.id] ?? null}
                onSort={onSortField}
                onRename={onRenameField}
                onDelete={onDeleteField}
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {groups
            ? (() => {
                let offset = 0;
                return groups.map(([groupKey, groupRecords]) => {
                  const isCollapsed = collapsedGroups.has(groupKey);
                  const label = groupKey || "(No value)";
                  const currentOffset = offset;
                  if (!isCollapsed) offset += groupRecords.length;

                  return [
                    <tr
                      key={`group-header-${groupKey}`}
                      className="group-header-row"
                      onClick={() => {
                        setCollapsedGroups((prev) => {
                          const next = new Set(prev);
                          if (next.has(groupKey)) next.delete(groupKey);
                          else next.add(groupKey);
                          return next;
                        });
                      }}
                    >
                      <td colSpan={fields.length + 1} className="group-header-cell">
                        <span className="group-header-toggle">{isCollapsed ? "▶" : "▼"}</span>
                        <span className="group-header-label">{label}</span>
                        <span className="group-header-count">{groupRecords.length}</span>
                      </td>
                    </tr>,
                    ...(!isCollapsed ? renderRows(groupRecords, currentOffset) : []),
                  ];
                });
              })()
            : renderRows(records, 0)}
        </tbody>
      </table>

      {!records.length ? (
        <EmptyState title="No records yet" message="Add a record to populate this table." />
      ) : null}
    </div>
  );
}
