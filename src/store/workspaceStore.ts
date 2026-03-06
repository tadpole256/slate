import { create } from "zustand";
import {
  attachFileToRecord as attachFileToRecordApi,
  createField,
  createRecord,
  createRecordLink as createRecordLinkApi,
  createTable,
  deleteAttachment as deleteAttachmentApi,
  deleteField,
  deleteRecord,
  deleteRecordLink as deleteRecordLinkApi,
  deleteTable,
  getTableSnapshot,
  initApp,
  listRecordAttachments as listRecordAttachmentsApi,
  listRecordLinks as listRecordLinksApi,
  listRecordOptions as listRecordOptionsApi,
  openAttachment as openAttachmentApi,
  renameField,
  renameTable,
  updateRecord
} from "../lib/tauri";
import { normalizeName } from "../lib/format";
import type {
  AppField,
  AppTable,
  FieldType,
  RecordAttachment,
  RecordLink,
  RecordOption,
  RecordRow
} from "../types/slate";

interface WorkspaceState {
  loading: boolean;
  error: string | null;
  tables: AppTable[];
  fieldsByTable: Record<string, AppField[]>;
  recordsByTable: Record<string, RecordRow[]>;
  linksByRecord: Record<string, RecordLink[]>;
  recordOptionsByTable: Record<string, RecordOption[]>;
  linksLoading: boolean;
  recordOptionsLoading: boolean;
  attachmentsByRecord: Record<string, RecordAttachment[]>;
  attachmentsLoading: boolean;
  activeTableId: string | null;
  selectedRecordId: string | null;
  searchQuery: string;
  createTableModalOpen: boolean;
  addColumnModalOpen: boolean;
  initialize: () => Promise<void>;
  setActiveTable: (tableId: string) => Promise<void>;
  refreshActiveTable: () => Promise<void>;
  setSearchQuery: (query: string) => void;
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
}

function buildDefaultValues(fields: AppField[]): Record<string, string | number | null> {
  return fields.reduce<Record<string, string | number | null>>((acc, field) => {
    if (field.field_type === "checkbox") {
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

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  loading: true,
  error: null,
  tables: [],
  fieldsByTable: {},
  recordsByTable: {},
  linksByRecord: {},
  recordOptionsByTable: {},
  linksLoading: false,
  recordOptionsLoading: false,
  attachmentsByRecord: {},
  attachmentsLoading: false,
  activeTableId: null,
  selectedRecordId: null,
  searchQuery: "",
  createTableModalOpen: false,
  addColumnModalOpen: false,

  initialize: async () => {
    set({ loading: true, error: null });

    try {
      const init = await withTimeout(
        initApp(),
        8000,
        "Slate backend did not respond during startup. Restart the app and try again."
      );
      const tables = init.tables;

      set({
        tables,
        activeTableId: tables[0]?.id ?? null,
        loading: false
      });

      if (tables[0]?.id) {
        await get().refreshActiveTable();
      }
    } catch (error) {
      set({
        loading: false,
        error: toErrorMessage(error, "Failed to initialize Slate")
      });
    }
  },

  setActiveTable: async (tableId) => {
    set({ activeTableId: tableId, selectedRecordId: null });
    await get().refreshActiveTable();
  },

  refreshActiveTable: async () => {
    const { activeTableId, searchQuery } = get();
    if (!activeTableId) {
      return;
    }

    try {
      const snapshot = await getTableSnapshot(activeTableId, searchQuery);

      set((state) => ({
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
        error: null
      }));
    } catch (error) {
      set({ error: toErrorMessage(error, "Failed to load table") });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  selectRecord: (recordId) => {
    set({ selectedRecordId: recordId });
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
  }
}));
