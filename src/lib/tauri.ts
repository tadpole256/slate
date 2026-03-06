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
    table_id: tableId,
    query: query?.trim() || null
  });
}

export async function createTable(displayName: string): Promise<AppTable> {
  return invoke<AppTable>("create_table", { display_name: displayName });
}

export async function renameTable(tableId: string, displayName: string): Promise<AppTable> {
  return invoke<AppTable>("rename_table", {
    table_id: tableId,
    display_name: displayName
  });
}

export async function deleteTable(tableId: string): Promise<void> {
  return invoke<void>("delete_table", { table_id: tableId });
}

export async function createField(input: FieldMutationInput): Promise<AppField> {
  return invoke<AppField>("create_field", {
    table_id: input.table_id,
    display_name: input.display_name,
    field_type: input.field_type
  });
}

export async function renameField(fieldId: string, displayName: string): Promise<AppField> {
  return invoke<AppField>("rename_field", {
    field_id: fieldId,
    display_name: displayName
  });
}

export async function deleteField(fieldId: string): Promise<void> {
  return invoke<void>("delete_field", { field_id: fieldId });
}

export async function createRecord(input: RecordMutationInput): Promise<RecordRow> {
  return invoke<RecordRow>("create_record", {
    table_id: input.table_id,
    values: input.values
  });
}

export async function updateRecord(input: RecordUpdateInput): Promise<RecordRow> {
  return invoke<RecordRow>("update_record", {
    table_id: input.table_id,
    record_id: input.record_id,
    values: input.values
  });
}

export async function deleteRecord(tableId: string, recordId: string): Promise<void> {
  return invoke<void>("delete_record", {
    table_id: tableId,
    record_id: recordId
  });
}
