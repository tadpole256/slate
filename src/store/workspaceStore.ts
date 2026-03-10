import { create } from "zustand";
import {
  attachFileToRecord as attachFileToRecordApi,
  createField,
  createFieldOption as createFieldOptionApi,
  createRecord,
  createRecordLink as createRecordLinkApi,
  createTable,
  createView as createViewApi,
  deleteAttachment as deleteAttachmentApi,
  deleteField,
  deleteFieldOption as deleteFieldOptionApi,
  deleteRecord,
  deleteRecordLink as deleteRecordLinkApi,
  deleteTable,
  deleteView as deleteViewApi,
  deleteRecords as deleteRecordsApi,
  exportCsv as exportCsvApi,
  getTableSnapshot,
  importCsv as importCsvApi,
  initApp,
  listRecordAttachments as listRecordAttachmentsApi,
  listRecordLinks as listRecordLinksApi,
  listRecordOptions as listRecordOptionsApi,
  openAttachment as openAttachmentApi,
  renameField,
  renameTable,
  renameView as renameViewApi,
  reorderFields as reorderFieldsApi,
  updateFieldOption as updateFieldOptionApi,
  updateRecord,
  updateViewConfig as updateViewConfigApi,
  // toggleFieldVisibility is now handled via view config (no backend call needed)
} from "../lib/tauri";
import { normalizeName } from "../lib/format";
import type {
  AppField,
  AppTable,
  AppView,
  FieldOption,
  FieldType,
  FilterInput,
  RecordAttachment,
  RecordLink,
  RecordOption,
  RecordRow,
  RowHeight,
  SortInput,
  ViewConfig,
} from "../types/slate";

interface WorkspaceState {
  debugLogs: string[];
  addDebugLog: (msg: string) => void;
  loading: boolean;
  error: string | null;
  tables: AppTable[];
  fieldsByTable: Record<string, AppField[]>;
  recordsByTable: Record<string, RecordRow[]>;
  fieldOptionsByField: Record<string, FieldOption[]>;
  linksByRecord: Record<string, RecordLink[]>;
  recordOptionsByTable: Record<string, RecordOption[]>;
  linksLoading: boolean;
  recordOptionsLoading: boolean;
  attachmentsByRecord: Record<string, RecordAttachment[]>;
  attachmentsLoading: boolean;
  activeTableId: string | null;
  selectedRecordId: string | null;
  searchQuery: string;
  sortsByTable: Record<string, SortInput[]>;
  filtersByTable: Record<string, FilterInput[]>;
  viewsByTable: Record<string, AppView[]>;
  activeViewIdByTable: Record<string, string | null>;
  hiddenFieldIdsByTable: Record<string, string[]>;
  rowHeightByTable: Record<string, RowHeight>;
  kanbanGroupByFieldIdByTable: Record<string, string | null>;
  groupByFieldIdByTable: Record<string, string | null>;
  calendarDateFieldIdByTable: Record<string, string | null>;
  createTableModalOpen: boolean;
  addColumnModalOpen: boolean;
  initialize: () => Promise<void>;
  forceStartupFailure: (message: string) => void;
  setActiveTable: (tableId: string) => Promise<void>;
  refreshActiveTable: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSorts: (tableId: string, sorts: SortInput[]) => void;
  setFilters: (tableId: string, filters: FilterInput[]) => void;
  toggleFieldVisibility: (fieldId: string) => Promise<void>;
  reorderFields: (tableId: string, fieldIds: string[]) => Promise<void>;
  setActiveView: (tableId: string, viewId: string) => void;
  setRowHeight: (tableId: string, height: RowHeight) => Promise<void>;
  setKanbanGroupByField: (tableId: string, fieldId: string) => Promise<void>;
  setGroupByField: (tableId: string, fieldId: string | null) => Promise<void>;
  setCalendarDateField: (tableId: string, fieldId: string | null) => Promise<void>;
  bulkDeleteRecords: (tableId: string, recordIds: string[]) => Promise<void>;
  createView: (tableId: string, name: string, viewType: string) => Promise<void>;
  renameView: (viewId: string, tableId: string, name: string) => Promise<void>;
  deleteView: (tableId: string, viewId: string) => Promise<void>;
  saveActiveViewConfig: (tableId: string) => Promise<void>;
  selectRecord: (recordId: string | null) => void;
  setCreateTableModalOpen: (open: boolean) => void;
  setAddColumnModalOpen: (open: boolean) => void;
  createTable: (displayName: string) => Promise<void>;
  renameTable: (tableId: string, displayName: string) => Promise<void>;
  deleteTable: (tableId: string) => Promise<void>;
  createField: (tableId: string, displayName: string, fieldType: FieldType) => Promise<void>;
  renameField: (fieldId: string, displayName: string) => Promise<void>;
  deleteField: (fieldId: string) => Promise<void>;
  createRecord: (tableId: string) => Promise<void>;
  updateRecordCell: (
    tableId: string,
    recordId: string,
    columnKey: string,
    value: string | number | null
  ) => Promise<void>;
  updateRecordValues: (
    tableId: string,
    recordId: string,
    values: Record<string, string | number | null>
  ) => Promise<void>;
  deleteRecord: (tableId: string, recordId: string) => Promise<void>;
  loadRecordLinks: (tableId: string, recordId: string) => Promise<void>;
  createRecordLink: (
    fromTableId: string,
    fromRecordId: string,
    toTableId: string,
    toRecordId: string
  ) => Promise<void>;
  deleteRecordLink: (tableId: string, recordId: string, linkId: string) => Promise<void>;
  loadRecordOptions: (tableId: string, query?: string) => Promise<void>;
  loadRecordAttachments: (tableId: string, recordId: string) => Promise<void>;
  attachFileToRecord: (tableId: string, recordId: string) => Promise<void>;
  deleteAttachment: (tableId: string, recordId: string, attachmentId: string) => Promise<void>;
  openAttachment: (attachmentId: string) => Promise<void>;
  createFieldOption: (fieldId: string, label: string, color?: string) => Promise<FieldOption | null>;
  updateFieldOption: (fieldId: string, optionId: string, label: string, color: string) => Promise<void>;
  deleteFieldOption: (fieldId: string, optionId: string) => Promise<void>;
  exportCsvTable: (tableId: string) => Promise<void>;
  importCsvToTable: (tableId: string) => Promise<void>;
}

function buildDefaultValues(fields: AppField[]): Record<string, string | number | null> {
  return fields.reduce<Record<string, string | number | null>>((acc, field) => {
    if (["checkbox", "rating", "duration", "number", "currency", "percent"].includes(field.field_type)) {
      acc[field.column_key] = 0;
    } else {
      acc[field.column_key] = "";
    }
    return acc;
  }, {});
}

function updateLocalRecord(
  records: RecordRow[],
  recordId: string,
  changes: Record<string, string | number | null>
): RecordRow[] {
  return records.map((record) => {
    if (record.record_id !== recordId) {
      return record;
    }

    return {
      ...record,
      values: {
        ...record.values,
        ...changes
      }
    };
  });
}

function recordAttachmentKey(tableId: string, recordId: string): string {
  return `${tableId}:${recordId}`;
}

function recordLinkKey(tableId: string, recordId: string): string {
  return `${tableId}:${recordId}`;
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }
  return fallback;
}

async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(message));
        }, ms);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function parseViewConfig(configJson: string): ViewConfig {
  try {
    const parsed = JSON.parse(configJson) as Partial<ViewConfig>;
    return {
      hiddenFieldIds: parsed.hiddenFieldIds ?? [],
      kanbanGroupByFieldId: parsed.kanbanGroupByFieldId,
      rowHeight: parsed.rowHeight,
      groupByFieldId: parsed.groupByFieldId,
      calendarDateFieldId: parsed.calendarDateFieldId,
    };
  } catch {
    return { hiddenFieldIds: [] };
  }
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  debugLogs: [],
  addDebugLog: (msg) => set((s) => ({ debugLogs: [...s.debugLogs, `${new Date().toISOString().substring(11, 23)} - ${msg}`] })),
  loading: true,
  error: null,
  tables: [],
  fieldsByTable: {},
  recordsByTable: {},
  fieldOptionsByField: {},
  linksByRecord: {},
  recordOptionsByTable: {},
  linksLoading: false,
  recordOptionsLoading: false,
  attachmentsByRecord: {},
  attachmentsLoading: false,
  activeTableId: null,
  selectedRecordId: null,
  searchQuery: "",
  sortsByTable: {},
  filtersByTable: {},
  viewsByTable: {},
  activeViewIdByTable: {},
  hiddenFieldIdsByTable: {},
  rowHeightByTable: {},
  kanbanGroupByFieldIdByTable: {},
  groupByFieldIdByTable: {},
  calendarDateFieldIdByTable: {},
  createTableModalOpen: false,
  addColumnModalOpen: false,

  initialize: async () => {
    get().addDebugLog("1. initialize() function started");
    set({ loading: true, error: null });

    try {
      get().addDebugLog("2. Handing off to withTimeout(initApp)");
      const initPromise = initApp();
      get().addDebugLog("3. initApp() Promise created");

      const init = await withTimeout(
        initPromise,
        8000,
        "Slate backend did not respond during startup. Restart the app and try again."
      );

      get().addDebugLog(`4. initApp() resolved, returned ${init.tables.length} tables`);
      const tables = init.tables;

      set({
        tables,
        activeTableId: tables[0]?.id ?? null,
        loading: false
      });
      get().addDebugLog("5. Loading state set to false in Zustand");

      if (tables[0]?.id) {
        get().addDebugLog("6. Calling refreshActiveTable");
        await get().refreshActiveTable();
        get().addDebugLog("7. refreshActiveTable resolved");
      }
    } catch (error) {
      const msg = toErrorMessage(error, "Failed to initialize Slate");
      get().addDebugLog("ERROR: " + msg);
      set({
        loading: false,
        error: msg
      });
    }
  },

  forceStartupFailure: (message) => {
    set((state) => {
      if (!state.loading) {
        return state;
      }
      return {
        ...state,
        loading: false,
        error: message
      };
    });
  },

  setActiveTable: async (tableId) => {
    set({ activeTableId: tableId, selectedRecordId: null });
    await get().refreshActiveTable();
  },

  refreshActiveTable: async () => {
    const { activeTableId, searchQuery, sortsByTable, filtersByTable } = get();
    if (!activeTableId) {
      return;
    }

    try {
      const sorts = sortsByTable[activeTableId];
      const filters = filtersByTable[activeTableId];
      const snapshot = await getTableSnapshot(activeTableId, searchQuery, sorts, filters);

      // Group field options by field_id for fast lookup
      const newFieldOptions: Record<string, FieldOption[]> = {};
      for (const opt of snapshot.field_options) {
        if (!newFieldOptions[opt.field_id]) {
          newFieldOptions[opt.field_id] = [];
        }
        newFieldOptions[opt.field_id].push(opt);
      }

      set((state) => {
        const alreadyHasView = !!state.activeViewIdByTable[activeTableId];
        const firstView = snapshot.views[0];

        let viewInit: Partial<WorkspaceState> = {};
        if (!alreadyHasView && firstView) {
          const config = parseViewConfig(firstView.config_json);
          viewInit = {
            activeViewIdByTable: { ...state.activeViewIdByTable, [activeTableId]: firstView.id },
            hiddenFieldIdsByTable: { ...state.hiddenFieldIdsByTable, [activeTableId]: config.hiddenFieldIds },
            rowHeightByTable: { ...state.rowHeightByTable, [activeTableId]: config.rowHeight ?? "default" },
            kanbanGroupByFieldIdByTable: { ...state.kanbanGroupByFieldIdByTable, [activeTableId]: config.kanbanGroupByFieldId ?? null },
            groupByFieldIdByTable: { ...state.groupByFieldIdByTable, [activeTableId]: config.groupByFieldId ?? null },
            calendarDateFieldIdByTable: { ...state.calendarDateFieldIdByTable, [activeTableId]: config.calendarDateFieldId ?? null },
          };
        }

        return {
          tables: state.tables.map((table) =>
            table.id === snapshot.table.id ? snapshot.table : table
          ),
          fieldsByTable: {
            ...state.fieldsByTable,
            [activeTableId]: snapshot.fields
          },
          recordsByTable: {
            ...state.recordsByTable,
            [activeTableId]: snapshot.records
          },
          fieldOptionsByField: {
            ...state.fieldOptionsByField,
            ...newFieldOptions
          },
          viewsByTable: {
            ...state.viewsByTable,
            [activeTableId]: snapshot.views,
          },
          error: null,
          ...viewInit,
        };
      });
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to load table") });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    if (get().activeTableId) {
      void get().refreshActiveTable();
    }
  },

  setSorts: (tableId, sorts) => {
    set((state) => ({
      sortsByTable: { ...state.sortsByTable, [tableId]: sorts }
    }));
    void get().refreshActiveTable();
  },

  setFilters: (tableId, filters) => {
    set((state) => ({
      filtersByTable: { ...state.filtersByTable, [tableId]: filters }
    }));
    void get().refreshActiveTable();
  },

  toggleFieldVisibility: async (fieldId) => {
    const { activeTableId, hiddenFieldIdsByTable } = get();
    if (!activeTableId) return;
    const hidden = hiddenFieldIdsByTable[activeTableId] ?? [];
    const newHidden = hidden.includes(fieldId)
      ? hidden.filter((id) => id !== fieldId)
      : [...hidden, fieldId];
    set((state) => ({
      hiddenFieldIdsByTable: { ...state.hiddenFieldIdsByTable, [activeTableId]: newHidden },
    }));
    await get().saveActiveViewConfig(activeTableId);
  },

  reorderFields: async (tableId, fieldIds) => {
    try {
      await reorderFieldsApi(tableId, fieldIds);
      await get().refreshActiveTable();
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to reorder fields") });
    }
  },

  setActiveView: (tableId, viewId) => {
    const { viewsByTable } = get();
    const view = (viewsByTable[tableId] ?? []).find((v) => v.id === viewId);
    if (!view) return;
    const config = parseViewConfig(view.config_json);
    set((state) => ({
      activeViewIdByTable: { ...state.activeViewIdByTable, [tableId]: viewId },
      hiddenFieldIdsByTable: { ...state.hiddenFieldIdsByTable, [tableId]: config.hiddenFieldIds },
      rowHeightByTable: { ...state.rowHeightByTable, [tableId]: config.rowHeight ?? "default" },
      kanbanGroupByFieldIdByTable: { ...state.kanbanGroupByFieldIdByTable, [tableId]: config.kanbanGroupByFieldId ?? null },
      groupByFieldIdByTable: { ...state.groupByFieldIdByTable, [tableId]: config.groupByFieldId ?? null },
      calendarDateFieldIdByTable: { ...state.calendarDateFieldIdByTable, [tableId]: config.calendarDateFieldId ?? null },
    }));
  },

  createView: async (tableId, name, viewType) => {
    try {
      const view = await createViewApi(tableId, name, viewType);
      set((state) => ({
        viewsByTable: {
          ...state.viewsByTable,
          [tableId]: [...(state.viewsByTable[tableId] ?? []), view],
        },
      }));
      get().setActiveView(tableId, view.id);
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to create view") });
    }
  },

  renameView: async (viewId, tableId, name) => {
    try {
      const updated = await renameViewApi(viewId, name);
      set((state) => ({
        viewsByTable: {
          ...state.viewsByTable,
          [tableId]: (state.viewsByTable[tableId] ?? []).map((v) =>
            v.id === viewId ? updated : v
          ),
        },
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to rename view") });
    }
  },

  deleteView: async (tableId, viewId) => {
    const { viewsByTable, activeViewIdByTable } = get();
    const views = viewsByTable[tableId] ?? [];
    if (views.length <= 1) return; // cannot delete last view
    try {
      await deleteViewApi(viewId);
      const nextViews = views.filter((v) => v.id !== viewId);
      set((state) => ({
        viewsByTable: { ...state.viewsByTable, [tableId]: nextViews },
      }));
      if (activeViewIdByTable[tableId] === viewId) {
        get().setActiveView(tableId, nextViews[0].id);
      }
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to delete view") });
    }
  },

  saveActiveViewConfig: async (tableId) => {
    const { activeViewIdByTable, hiddenFieldIdsByTable, rowHeightByTable, kanbanGroupByFieldIdByTable, groupByFieldIdByTable, calendarDateFieldIdByTable } = get();
    const viewId = activeViewIdByTable[tableId];
    if (!viewId) return;
    const rowHeight = rowHeightByTable[tableId];
    const kanbanGroupByFieldId = kanbanGroupByFieldIdByTable[tableId] ?? undefined;
    const groupByFieldId = groupByFieldIdByTable[tableId] ?? undefined;
    const calendarDateFieldId = calendarDateFieldIdByTable[tableId] ?? undefined;
    const config: ViewConfig = {
      hiddenFieldIds: hiddenFieldIdsByTable[tableId] ?? [],
      ...(kanbanGroupByFieldId ? { kanbanGroupByFieldId } : {}),
      ...(rowHeight && rowHeight !== "default" ? { rowHeight } : {}),
      ...(groupByFieldId ? { groupByFieldId } : {}),
      ...(calendarDateFieldId ? { calendarDateFieldId } : {}),
    };
    try {
      const updated = await updateViewConfigApi(viewId, JSON.stringify(config));
      set((state) => ({
        viewsByTable: {
          ...state.viewsByTable,
          [tableId]: (state.viewsByTable[tableId] ?? []).map((v) =>
            v.id === viewId ? updated : v
          ),
        },
      }));
    } catch {
      // non-critical
    }
  },

  setRowHeight: async (tableId, height) => {
    set((state) => ({
      rowHeightByTable: { ...state.rowHeightByTable, [tableId]: height },
    }));
    await get().saveActiveViewConfig(tableId);
  },

  setKanbanGroupByField: async (tableId, fieldId) => {
    set((state) => ({
      kanbanGroupByFieldIdByTable: { ...state.kanbanGroupByFieldIdByTable, [tableId]: fieldId },
    }));
    await get().saveActiveViewConfig(tableId);
  },

  setGroupByField: async (tableId, fieldId) => {
    set((state) => ({
      groupByFieldIdByTable: { ...state.groupByFieldIdByTable, [tableId]: fieldId },
    }));
    await get().saveActiveViewConfig(tableId);
  },

  setCalendarDateField: async (tableId, fieldId) => {
    set((state) => ({
      calendarDateFieldIdByTable: { ...state.calendarDateFieldIdByTable, [tableId]: fieldId },
    }));
    await get().saveActiveViewConfig(tableId);
  },

  bulkDeleteRecords: async (tableId, recordIds) => {
    if (!recordIds.length) return;
    try {
      await deleteRecordsApi(tableId, recordIds);
      const idSet = new Set(recordIds);
      set((state) => ({
        recordsByTable: {
          ...state.recordsByTable,
          [tableId]: (state.recordsByTable[tableId] ?? []).filter((r) => !idSet.has(r.record_id)),
        },
        selectedRecordId: idSet.has(state.selectedRecordId ?? "") ? null : state.selectedRecordId,
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to delete records") });
    }
  },

  selectRecord: (recordId) => {
    set({ selectedRecordId: recordId });
    if (recordId) {
      const { activeTableId } = get();
      if (activeTableId) {
        void get().loadRecordAttachments(activeTableId, recordId);
        void get().loadRecordLinks(activeTableId, recordId);
      }
    }
  },

  setCreateTableModalOpen: (open) => {
    set({ createTableModalOpen: open });
  },

  setAddColumnModalOpen: (open) => {
    set({ addColumnModalOpen: open });
  },

  createTable: async (displayName) => {
    const trimmed = normalizeName(displayName);
    if (!trimmed) {
      return;
    }

    try {
      const table = await createTable(trimmed);
      set((state) => ({
        tables: [...state.tables, table],
        activeTableId: table.id,
        selectedRecordId: null,
        createTableModalOpen: false,
        searchQuery: ""
      }));
      await get().refreshActiveTable();
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to create table") });
    }
  },

  renameTable: async (tableId, displayName) => {
    const trimmed = normalizeName(displayName);
    if (!trimmed) {
      return;
    }

    try {
      const updated = await renameTable(tableId, trimmed);
      set((state) => ({
        tables: state.tables.map((table) => (table.id === tableId ? updated : table))
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to rename table") });
    }
  },

  deleteTable: async (tableId) => {
    try {
      await deleteTable(tableId);

      const state = get();
      const nextTables = state.tables.filter((table) => table.id !== tableId);
      const nextActive = state.activeTableId === tableId ? nextTables[0]?.id ?? null : state.activeTableId;

      set((current) => ({
        linksByRecord: Object.fromEntries(
          Object.entries(current.linksByRecord).filter(([key]) => !key.startsWith(`${tableId}:`))
        ),
        attachmentsByRecord: Object.fromEntries(
          Object.entries(current.attachmentsByRecord).filter(([key]) => !key.startsWith(`${tableId}:`))
        ),
        tables: nextTables,
        activeTableId: nextActive,
        selectedRecordId: null,
        fieldsByTable: {
          ...current.fieldsByTable,
          [tableId]: []
        },
        recordsByTable: {
          ...current.recordsByTable,
          [tableId]: []
        }
      }));

      if (nextActive) {
        await get().refreshActiveTable();
      }
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to delete table") });
    }
  },

  createField: async (tableId, displayName, fieldType) => {
    const trimmed = normalizeName(displayName);
    if (!trimmed) {
      return;
    }

    try {
      await createField({ table_id: tableId, display_name: trimmed, field_type: fieldType });
      set({ addColumnModalOpen: false });
      await get().refreshActiveTable();
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to create column") });
    }
  },

  renameField: async (fieldId, displayName) => {
    const trimmed = normalizeName(displayName);
    if (!trimmed) {
      return;
    }

    try {
      const updated = await renameField(fieldId, trimmed);
      set((state) => {
        const tableFields = state.fieldsByTable[updated.table_id] ?? [];
        return {
          fieldsByTable: {
            ...state.fieldsByTable,
            [updated.table_id]: tableFields.map((field) =>
              field.id === updated.id ? updated : field
            )
          }
        };
      });
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to rename column") });
    }
  },

  deleteField: async (fieldId) => {
    const state = get();
    const match = Object.values(state.fieldsByTable)
      .flat()
      .find((field) => field.id === fieldId);

    if (!match) {
      return;
    }

    try {
      await deleteField(fieldId);
      await get().refreshActiveTable();
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to delete column") });
    }
  },

  createRecord: async (tableId) => {
    const fields = get().fieldsByTable[tableId] ?? [];
    const values = buildDefaultValues(fields);

    try {
      const record = await createRecord({ table_id: tableId, values });
      set((state) => ({
        recordsByTable: {
          ...state.recordsByTable,
          [tableId]: [record, ...(state.recordsByTable[tableId] ?? [])]
        },
        selectedRecordId: record.record_id
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to create record") });
    }
  },

  updateRecordCell: async (tableId, recordId, columnKey, value) => {
    await get().updateRecordValues(tableId, recordId, { [columnKey]: value });
  },

  updateRecordValues: async (tableId, recordId, values) => {
    set((state) => ({
      recordsByTable: {
        ...state.recordsByTable,
        [tableId]: updateLocalRecord(state.recordsByTable[tableId] ?? [], recordId, values)
      }
    }));

    try {
      const updated = await updateRecord({ table_id: tableId, record_id: recordId, values });

      set((state) => ({
        recordsByTable: {
          ...state.recordsByTable,
          [tableId]: (state.recordsByTable[tableId] ?? []).map((record) =>
            record.record_id === updated.record_id ? updated : record
          )
        }
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to update record") });
      await get().refreshActiveTable();
    }
  },

  deleteRecord: async (tableId, recordId) => {
    try {
      await deleteRecord(tableId, recordId);
      const attachmentKey = recordAttachmentKey(tableId, recordId);
      const linkKey = recordLinkKey(tableId, recordId);
      set((state) => ({
        linksByRecord: Object.fromEntries(
          Object.entries(state.linksByRecord).filter(([key]) => key !== linkKey)
        ),
        attachmentsByRecord: Object.fromEntries(
          Object.entries(state.attachmentsByRecord).filter(([key]) => key !== attachmentKey)
        ),
        recordsByTable: {
          ...state.recordsByTable,
          [tableId]: (state.recordsByTable[tableId] ?? []).filter(
            (record) => record.record_id !== recordId
          )
        },
        selectedRecordId: state.selectedRecordId === recordId ? null : state.selectedRecordId
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to delete record") });
    }
  },

  loadRecordLinks: async (tableId, recordId) => {
    const key = recordLinkKey(tableId, recordId);
    set({ linksLoading: true });
    try {
      const links = await listRecordLinksApi(tableId, recordId);
      set((state) => ({
        linksByRecord: {
          ...state.linksByRecord,
          [key]: links
        },
        linksLoading: false,
        error: null
      }));
    } catch (error) {
      set({
        linksLoading: false,
        error: toErrorMessage(error, "Failed to load linked records")
      });
    }
  },

  createRecordLink: async (fromTableId, fromRecordId, toTableId, toRecordId) => {
    const key = recordLinkKey(fromTableId, fromRecordId);
    try {
      const link = await createRecordLinkApi(fromTableId, fromRecordId, toTableId, toRecordId);
      set((state) => ({
        linksByRecord: {
          ...state.linksByRecord,
          [key]: [link, ...(state.linksByRecord[key] ?? []).filter((item) => item.id !== link.id)]
        },
        error: null
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to create linked record reference") });
    }
  },

  deleteRecordLink: async (tableId, recordId, linkId) => {
    const key = recordLinkKey(tableId, recordId);
    try {
      await deleteRecordLinkApi(linkId);
      set((state) => ({
        linksByRecord: {
          ...state.linksByRecord,
          [key]: (state.linksByRecord[key] ?? []).filter((link) => link.id !== linkId)
        },
        error: null
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to remove linked record reference") });
    }
  },

  loadRecordOptions: async (tableId, query) => {
    set({ recordOptionsLoading: true });
    try {
      const options = await listRecordOptionsApi(tableId, query);
      set((state) => ({
        recordOptionsByTable: {
          ...state.recordOptionsByTable,
          [tableId]: options
        },
        recordOptionsLoading: false,
        error: null
      }));
    } catch (error) {
      set({
        recordOptionsLoading: false,
        error: toErrorMessage(error, "Failed to load records for linking")
      });
    }
  },

  loadRecordAttachments: async (tableId, recordId) => {
    const key = recordAttachmentKey(tableId, recordId);
    set({ attachmentsLoading: true });
    try {
      const attachments = await listRecordAttachmentsApi(tableId, recordId);
      set((state) => ({
        attachmentsByRecord: {
          ...state.attachmentsByRecord,
          [key]: attachments
        },
        attachmentsLoading: false,
        error: null
      }));
    } catch (error) {
      set({
        attachmentsLoading: false,
        error: toErrorMessage(error, "Failed to load attachments")
      });
    }
  },

  attachFileToRecord: async (tableId, recordId) => {
    const key = recordAttachmentKey(tableId, recordId);
    try {
      const attachment = await attachFileToRecordApi(tableId, recordId);
      if (!attachment) {
        return;
      }

      set((state) => ({
        attachmentsByRecord: {
          ...state.attachmentsByRecord,
          [key]: [attachment, ...(state.attachmentsByRecord[key] ?? [])]
        },
        error: null
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to attach file") });
    }
  },

  deleteAttachment: async (tableId, recordId, attachmentId) => {
    const key = recordAttachmentKey(tableId, recordId);
    try {
      await deleteAttachmentApi(attachmentId);
      set((state) => ({
        attachmentsByRecord: {
          ...state.attachmentsByRecord,
          [key]: (state.attachmentsByRecord[key] ?? []).filter(
            (attachment) => attachment.id !== attachmentId
          )
        },
        error: null
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to delete attachment") });
    }
  },

  openAttachment: async (attachmentId) => {
    try {
      await openAttachmentApi(attachmentId);
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to open attachment") });
    }
  },

  createFieldOption: async (fieldId, label, color = "default") => {
    try {
      const option = await createFieldOptionApi(fieldId, label, color);
      set((state) => ({
        fieldOptionsByField: {
          ...state.fieldOptionsByField,
          [fieldId]: [...(state.fieldOptionsByField[fieldId] ?? []), option]
        },
        error: null
      }));
      return option;
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to create field option") });
      return null;
    }
  },

  updateFieldOption: async (fieldId, optionId, label, color) => {
    try {
      const updated = await updateFieldOptionApi(optionId, label, color);
      set((state) => ({
        fieldOptionsByField: {
          ...state.fieldOptionsByField,
          [fieldId]: (state.fieldOptionsByField[fieldId] ?? []).map((opt) =>
            opt.id === optionId ? updated : opt
          )
        },
        error: null
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to update field option") });
    }
  },

  deleteFieldOption: async (fieldId, optionId) => {
    try {
      await deleteFieldOptionApi(optionId);
      set((state) => ({
        fieldOptionsByField: {
          ...state.fieldOptionsByField,
          [fieldId]: (state.fieldOptionsByField[fieldId] ?? []).filter(
            (opt) => opt.id !== optionId
          )
        },
        error: null
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to delete field option") });
    }
  },

  exportCsvTable: async (tableId) => {
    try {
      await exportCsvApi(tableId);
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to export CSV") });
    }
  },

  importCsvToTable: async (tableId) => {
    try {
      const count = await importCsvApi(tableId);
      if (count !== null && count > 0) {
        await get().refreshActiveTable();
      }
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to import CSV") });
    }
  },
}));
