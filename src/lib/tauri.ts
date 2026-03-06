import { invoke } from "@tauri-apps/api/core";
import type {
  AppField,
  AppTable,
  FieldMutationInput,
  InitResponse,
  RecordMutationInput,
  RecordRow,
  RecordUpdateInput,
  TableSnapshot
} from "../types/slate";

export async function initApp(): Promise<InitResponse> {
  return invoke<InitResponse>("init_app");
}

export async function listTables(): Promise<AppTable[]> {
  return invoke<AppTable[]>("list_tables");
}

export async function getTableSnapshot(tableId: string, query?: string): Promise<TableSnapshot> {
  return invoke<TableSnapshot>("get_table_snapshot", {
    tableId,
    query: query?.trim() || null
  });
}

export async function createTable(displayName: string): Promise<AppTable> {
  return invoke<AppTable>("create_table", { displayName });
}

export async function renameTable(tableId: string, displayName: string): Promise<AppTable> {
  return invoke<AppTable>("rename_table", {
    tableId,
    displayName
  });
}

export async function deleteTable(tableId: string): Promise<void> {
  return invoke<void>("delete_table", { tableId });
}

export async function createField(input: FieldMutationInput): Promise<AppField> {
  return invoke<AppField>("create_field", {
    tableId: input.table_id,
    displayName: input.display_name,
    fieldType: input.field_type
  });
}

export async function renameField(fieldId: string, displayName: string): Promise<AppField> {
  return invoke<AppField>("rename_field", {
    fieldId,
    displayName
  });
}

export async function deleteField(fieldId: string): Promise<void> {
  return invoke<void>("delete_field", { fieldId });
}

export async function createRecord(input: RecordMutationInput): Promise<RecordRow> {
  return invoke<RecordRow>("create_record", {
    tableId: input.table_id,
    values: input.values
  });
}

export async function updateRecord(input: RecordUpdateInput): Promise<RecordRow> {
  return invoke<RecordRow>("update_record", {
    tableId: input.table_id,
    recordId: input.record_id,
    values: input.values
  });
}

export async function deleteRecord(tableId: string, recordId: string): Promise<void> {
  return invoke<void>("delete_record", {
    tableId,
    recordId
  });
}
