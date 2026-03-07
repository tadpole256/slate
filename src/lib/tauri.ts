import { invoke } from "@tauri-apps/api/core";
import type {
  AppField,
  AppTable,
  AppView,
  FieldMutationInput,
  FieldOption,
  FilterInput,
  InitResponse,
  RecordAttachment,
  RecordLink,
  RecordOption,
  RecordMutationInput,
  RecordRow,
  RecordUpdateInput,
  SortInput,
  TableSnapshot
} from "../types/slate";

export async function initApp(): Promise<InitResponse> {
  return invoke<InitResponse>("init_app");
}

export async function listTables(): Promise<AppTable[]> {
  return invoke<AppTable[]>("list_tables");
}

export async function getTableSnapshot(
  tableId: string,
  query?: string,
  sorts?: SortInput[],
  filters?: FilterInput[]
): Promise<TableSnapshot> {
  return invoke<TableSnapshot>("get_table_snapshot", {
    tableId,
    query: query?.trim() || null,
    sorts: sorts?.length ? sorts : null,
    filters: filters?.length ? filters : null,
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

export async function listRecordAttachments(
  tableId: string,
  recordId: string
): Promise<RecordAttachment[]> {
  return invoke<RecordAttachment[]>("list_record_attachments", {
    tableId,
    recordId
  });
}

export async function attachFileToRecord(
  tableId: string,
  recordId: string
): Promise<RecordAttachment | null> {
  return invoke<RecordAttachment | null>("attach_file_to_record", {
    tableId,
    recordId
  });
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  return invoke<void>("delete_attachment", { attachmentId });
}

export async function openAttachment(attachmentId: string): Promise<void> {
  return invoke<void>("open_attachment", { attachmentId });
}

export async function listRecordLinks(tableId: string, recordId: string): Promise<RecordLink[]> {
  return invoke<RecordLink[]>("list_record_links", {
    tableId,
    recordId
  });
}

export async function createRecordLink(
  fromTableId: string,
  fromRecordId: string,
  toTableId: string,
  toRecordId: string,
  linkType = "related"
): Promise<RecordLink> {
  return invoke<RecordLink>("create_record_link", {
    fromTableId,
    fromRecordId,
    toTableId,
    toRecordId,
    linkType
  });
}

export async function deleteRecordLink(linkId: string): Promise<void> {
  return invoke<void>("delete_record_link", { linkId });
}

export async function listRecordOptions(tableId: string, query?: string): Promise<RecordOption[]> {
  return invoke<RecordOption[]>("list_record_options", {
    tableId,
    query: query?.trim() || null
  });
}

export async function listFieldOptions(fieldId: string): Promise<FieldOption[]> {
  return invoke<FieldOption[]>("list_field_options", { fieldId });
}

export async function createFieldOption(
  fieldId: string,
  label: string,
  color = "default"
): Promise<FieldOption> {
  return invoke<FieldOption>("create_field_option", { fieldId, label, color });
}

export async function updateFieldOption(
  optionId: string,
  label: string,
  color: string
): Promise<FieldOption> {
  return invoke<FieldOption>("update_field_option", { optionId, label, color });
}

export async function deleteFieldOption(optionId: string): Promise<void> {
  return invoke<void>("delete_field_option", { optionId });
}

export async function reorderFieldOptions(optionIds: string[]): Promise<void> {
  return invoke<void>("reorder_field_options", { optionIds });
}

export async function reorderFields(tableId: string, fieldIds: string[]): Promise<void> {
  return invoke<void>("reorder_fields", { tableId, fieldIds });
}

export async function toggleFieldVisibility(fieldId: string): Promise<AppField> {
  return invoke<AppField>("toggle_field_visibility", { fieldId });
}

export async function listViews(tableId: string): Promise<AppView[]> {
  return invoke<AppView[]>("list_views", { tableId });
}

export async function createView(tableId: string, name: string, viewType: string): Promise<AppView> {
  return invoke<AppView>("create_view", { tableId, name, viewType });
}

export async function renameView(viewId: string, name: string): Promise<AppView> {
  return invoke<AppView>("rename_view", { viewId, name });
}

export async function deleteView(viewId: string): Promise<void> {
  return invoke<void>("delete_view", { viewId });
}

export async function updateViewConfig(viewId: string, configJson: string): Promise<AppView> {
  return invoke<AppView>("update_view_config", { viewId, configJson });
}
