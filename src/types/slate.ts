export type FieldType = "text" | "long_text" | "date" | "checkbox" | "link";

export interface AppTable {
  id: string;
  display_name: string;
  storage_name: string;
  primary_field_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppField {
  id: string;
  table_id: string;
  column_key: string;
  display_name: string;
  field_type: FieldType;
  field_order: number;
  is_visible: number;
  is_primary_label: number;
  created_at: string;
  updated_at: string;
}

export interface RecordRow {
  record_id: string;
  created_at: string;
  updated_at: string;
  values: Record<string, string | number | null>;
}

export interface TableSnapshot {
  table: AppTable;
  fields: AppField[];
  records: RecordRow[];
}

export interface InitResponse {
  tables: AppTable[];
}

export interface FieldMutationInput {
  table_id: string;
  display_name: string;
  field_type: FieldType;
}

export interface RecordMutationInput {
  table_id: string;
  values: Record<string, string | number | null>;
}

export interface RecordUpdateInput extends RecordMutationInput {
  record_id: string;
}

export interface RecordAttachment {
  id: string;
  table_id: string;
  record_id: string;
  file_name: string;
  stored_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}
