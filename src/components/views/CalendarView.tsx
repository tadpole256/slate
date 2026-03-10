import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppField, FieldOption, RecordRow } from "../../types/slate";

interface CalendarViewProps {
  fields: AppField[];
  records: RecordRow[];
  fieldOptionsByField: Record<string, FieldOption[]>;
  calendarDateFieldId: string | null;
  onSetCalendarDateField: (fieldId: string | null) => void;
  onSelectRecord: (recordId: string) => void;
  onExpandRecord?: (recordId: string) => void;
}

function isoDatePrefix(val: unknown): string | null {
  if (typeof val !== "string" || !val) return null;
  // Accept YYYY-MM-DD or ISO datetime
  const m = val.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function formatMonthYear(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

export function CalendarView({
  fields,
  records,
  calendarDateFieldId,
  onSetCalendarDateField,
  onSelectRecord,
  onExpandRecord,
}: CalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const dateFields = useMemo(
    () => fields.filter((f) => f.field_type === "date"),
    [fields]
  );

  const activeDateField = useMemo(
    () => (calendarDateFieldId ? fields.find((f) => f.id === calendarDateFieldId) : null),
    [calendarDateFieldId, fields]
  );

  // Build a map of date string → records
  const recordsByDate = useMemo(() => {
    const map = new Map<string, RecordRow[]>();
    if (!activeDateField) return map;
    for (const record of records) {
      const dateStr = isoDatePrefix(record.values[activeDateField.column_key]);
      if (!dateStr) continue;
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(record);
    }
    return map;
  }, [records, activeDateField]);

  // Build 7×6 calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startDow = firstDay.getDay(); // 0 = Sunday
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{ date: Date; dateStr: string; isCurrentMonth: boolean } | null> = [];

    // Pad beginning
    for (let i = 0; i < startDow; i++) {
      const d = new Date(viewYear, viewMonth, 1 - (startDow - i));
      const dateStr = d.toISOString().slice(0, 10);
      cells.push({ date: d, dateStr, isCurrentMonth: false });
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const dateStr = date.toISOString().slice(0, 10);
      cells.push({ date, dateStr, isCurrentMonth: true });
    }
    // Pad end to 42 cells (6 rows)
    while (cells.length < 42) {
      const d = new Date(viewYear, viewMonth + 1, cells.length - daysInMonth - startDow + 1);
      const dateStr = d.toISOString().slice(0, 10);
      cells.push({ date: d, dateStr, isCurrentMonth: false });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const todayStr = today.toISOString().slice(0, 10);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  // Primary field for label
  const primaryField = fields.find((f) => f.is_primary_label);

  function getRecordLabel(record: RecordRow): string {
    if (primaryField) {
      const val = record.values[primaryField.column_key];
      if (val !== null && val !== undefined) return String(val);
    }
    return record.record_id.slice(0, 8);
  }

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button className="action-button secondary" onClick={prevMonth} title="Previous month">
            <ChevronLeft size={16} />
          </button>
          <span className="calendar-month-label">{formatMonthYear(viewYear, viewMonth)}</span>
          <button className="action-button secondary" onClick={nextMonth} title="Next month">
            <ChevronRight size={16} />
          </button>
          <button
            className="action-button secondary"
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
            title="Go to today"
          >
            Today
          </button>
        </div>

        <div className="calendar-date-field-picker">
          <label>Date field:</label>
          <select
            value={calendarDateFieldId ?? ""}
            onChange={(e) => onSetCalendarDateField(e.target.value || null)}
          >
            <option value="">— none —</option>
            {dateFields.map((f) => (
              <option key={f.id} value={f.id}>{f.display_name}</option>
            ))}
          </select>
        </div>
      </div>

      {!activeDateField ? (
        <div className="calendar-no-field">
          <p>Select a date field above to display records on the calendar.</p>
        </div>
      ) : (
        <div className="calendar-grid">
          {/* Day headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="calendar-day-header">{d}</div>
          ))}
          {/* Day cells */}
          {calendarDays.map((cell, i) => {
            const cellRecords = cell ? (recordsByDate.get(cell.dateStr) ?? []) : [];
            const isToday = cell?.dateStr === todayStr;
            return (
              <div
                key={i}
                className={[
                  "calendar-cell",
                  cell?.isCurrentMonth ? "" : "calendar-cell-faded",
                  isToday ? "calendar-cell-today" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="calendar-day-num">{cell?.date.getDate()}</span>
                <div className="calendar-cell-records">
                  {cellRecords.map((record) => (
                    <div
                      key={record.record_id}
                      className="calendar-record-chip"
                      onClick={() => onSelectRecord(record.record_id)}
                      onDoubleClick={() => onExpandRecord?.(record.record_id)}
                      title={getRecordLabel(record)}
                    >
                      {getRecordLabel(record)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
