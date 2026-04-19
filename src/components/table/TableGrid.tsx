import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const COL_WIDTH_PREFIX = "slate-col-w-";
const MIN_COL_WIDTH = 60;

function loadColWidths(fields: AppField[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const f of fields) {
    const raw = localStorage.getItem(COL_WIDTH_PREFIX + f.id);
    if (raw) {
      const n = parseInt(raw, 10);
      if (n >= MIN_COL_WIDTH) result[f.id] = n;
    }
  }
  return result;
}
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
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
  onReorderFields?: (newFieldIds: string[]) => void;
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
  onReorderFields,
}: TableGridProps) {
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [localFields, setLocalFields] = useState<AppField[]>(fields);
  const [activeField, setActiveField] = useState<AppField | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => loadColWidths(fields));
  const lastClickedIdxRef = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const resizingRef = useRef<{ fieldId: string; startX: number; startWidth: number } | null>(null);

  // Keep local fields in sync with prop (after persisted reorder or external update)
  useEffect(() => {
    setLocalFields(fields);
    setColWidths(loadColWidths(fields));
  }, [fields]);

  // Column resize mouse handlers
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizingRef.current) return;
      const { fieldId, startX, startWidth } = resizingRef.current;
      const delta = e.clientX - startX;
      const next = Math.max(MIN_COL_WIDTH, startWidth + delta);
      setColWidths((prev) => ({ ...prev, [fieldId]: next }));
    }
    function onMouseUp() {
      if (!resizingRef.current) return;
      const { fieldId } = resizingRef.current;
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setColWidths((prev) => {
        if (prev[fieldId]) localStorage.setItem(COL_WIDTH_PREFIX + fieldId, String(prev[fieldId]));
        return prev;
      });
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function handleResizeStart(e: React.MouseEvent, fieldId: string) {
    const th = (e.target as HTMLElement).closest("th");
    const startWidth = th ? th.getBoundingClientRect().width : (colWidths[fieldId] ?? 160);
    resizingRef.current = { fieldId, startX: e.clientX, startWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    const found = localFields.find((f) => f.id === event.active.id);
    setActiveField(found ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveField(null);
    if (!over || active.id === over.id) return;
    const oldIdx = localFields.findIndex((f) => f.id === active.id);
    const newIdx = localFields.findIndex((f) => f.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(localFields, oldIdx, newIdx);
    setLocalFields(reordered);
    onReorderFields?.(reordered.map((f) => f.id));
  }

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
      if (!orderedRecords.length || !localFields.length) return;

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
      const lastCol = localFields.length - 1;

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
    [focusedCell, orderedRecords, localFields, onSelectRecord, onDoubleClickRecord]
  );

  if (!localFields.length) {
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
          {localFields.map((field, colIndex) => (
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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <table className={gridClass}>
          <colgroup>
            <col style={{ width: 36, minWidth: 36 }} />
            {localFields.map((field) => (
              <col
                key={field.id}
                style={colWidths[field.id] ? { width: colWidths[field.id], minWidth: colWidths[field.id] } : undefined}
              />
            ))}
          </colgroup>
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
              <SortableContext
                items={localFields.map((f) => f.id)}
                strategy={horizontalListSortingStrategy}
              >
                {localFields.map((field) => (
                  <TableHeaderCell
                    key={field.id}
                    field={field}
                    sortDirection={sortByField[field.id] ?? null}
                    width={colWidths[field.id]}
                    onSort={onSortField}
                    onRename={onRenameField}
                    onDelete={onDeleteField}
                    onResizeStart={handleResizeStart}
                  />
                ))}
              </SortableContext>
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
                        <td colSpan={localFields.length + 1} className="group-header-cell">
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

        <DragOverlay>
          {activeField ? (
            <div className="column-drag-overlay">{activeField.display_name}</div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {!records.length ? (
        <EmptyState title="No records yet" message="Add a record to populate this table." />
      ) : null}
    </div>
  );
}
