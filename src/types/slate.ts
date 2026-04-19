export type FieldType =
  | "text"
  | "long_text"
  | "date"
  | "checkbox"
  | "link"
  | "number"
  | "currency"
  | "percent"
  | "email"
  | "url"
  | "phone"
  | "single_select"
  | "multi_select"
  | "rating"
  | "duration"
  | "lookup"
  | "rollup"
  | "formula"
  | "tags";

export const COMPUTED_FIELD_TYPES = new Set<FieldType>(["lookup", "rollup", "formula"]);
export const isComputedFieldType = (ft: FieldType): boolean => COMPUTED_FIELD_TYPES.has(ft);

export interface AppTable {
  id: string;
  display_name: string;
  storage_name: string;
  primary_field_id: string | null;
  created_at: string;
  updated_at: string;
  /** 1 if this table is backed by an external ATTACH'd SQLite DB, 0 otherwise. */
  is_external: number;
  /** Folder this table belongs to, or undefined if ungrouped. */
  folder_id?: string | null;
}

export interface AppFolder {
  id: string;
  name: string;
  folder_order: number;
  created_at: string;
  updated_at: string;
}

export interface ExternalConnection {
  alias: string;
  file_path: string;
  table_ids: string[];
  table_names: string[];
}

export interface RecordDetailPayload {
  table: AppTable;
  fields: AppField[];
  field_options: Record<string, FieldOption[]>;
  record: RecordRow;
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
  computed_config?: string;
}

export interface FieldOption {
  id: string;
  field_id: string;
  label: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface RecordRow {
  record_id: string;
  created_at: string;
  updated_at: string;
  values: Record<string, string | number | null>;
}

export type ViewType = "grid" | "gallery" | "kanban" | "calendar" | "form";
export type RowHeight = "compact" | "default" | "tall";

export interface AppView {
  id: string;
  table_id: string;
  name: string;
  view_type: ViewType;
  config_json: string;
  created_at: string;
  updated_at: string;
}

export interface ViewConfig {
  hiddenFieldIds: string[];
  kanbanGroupByFieldId?: string;
  rowHeight?: RowHeight;
  groupByFieldId?: string;
  calendarDateFieldId?: string;
}

export interface TableSnapshot {
  table: AppTable;
  fields: AppField[];
  records: RecordRow[];
  field_options: FieldOption[];
  views: AppView[];
}

export interface InitResponse {
  tables: AppTable[];
}

export type SortDirection = "asc" | "desc";

export interface SortInput {
  field_id: string;
  direction: SortDirection;
}

export type FilterOp =
  | "eq"
  | "neq"
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty"
  | "gt"
  | "lt"
  | "gte"
  | "lte";

export interface FilterInput {
  field_id: string;
  op: FilterOp;
  value?: string;
}

export interface FieldMutationInput {
  table_id: string;
  display_name: string;
  field_type: FieldType;
  computed_config?: string;
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

export interface RecordOption {
  record_id: string;
  label: string;
}

export interface BackupFile {
  name: string;
  path: string;
  size_bytes: number;
}

export interface RecordNote {
  id: string;
  table_id: string;
  record_id: string;
  body: string;
  created_at: string;
}

export interface RecordLink {
  id: string;
  from_table_id: string;
  from_record_id: string;
  to_table_id: string;
  to_record_id: string;
  to_table_name: string;
  to_record_label: string;
  link_type: string;
  created_at: string;
}
