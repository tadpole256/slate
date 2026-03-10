use std::collections::HashMap;

use anyhow::{anyhow, Result};
use evalexpr::ContextWithMutableVariables;
use rusqlite::{params_from_iter, types::Value as SqlValue, Connection, OptionalExtension, Row};
use serde_json::Value;

use crate::db::{quote_ident, now_iso};
use crate::models::{AppField, FilterInput, RecordRow, SortInput};
use crate::services::{filter_service, metadata_service, search_service, table_service};

// ── SQL type helpers ──────────────────────────────────────────────────────────

fn sql_value_to_json(v: rusqlite::types::Value) -> Value {
    match v {
        rusqlite::types::Value::Null => Value::Null,
        rusqlite::types::Value::Integer(i) => Value::Number(i.into()),
        rusqlite::types::Value::Real(f) => serde_json::Number::from_f64(f)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        rusqlite::types::Value::Text(s) => Value::String(s),
        rusqlite::types::Value::Blob(_) => Value::Null,
    }
}

fn json_to_sql(value: Option<&Value>, field_type: &str) -> SqlValue {
    match value {
        None | Some(Value::Null) => SqlValue::Null,
        Some(value) if field_type == "checkbox" => match value {
            Value::Bool(flag) => SqlValue::Integer(if *flag { 1 } else { 0 }),
            Value::Number(number) => SqlValue::Integer(number.as_i64().unwrap_or(0)),
            Value::String(text) => {
                let lowered = text.trim().to_ascii_lowercase();
                let int_value = if lowered == "1" || lowered == "true" || lowered == "yes" {
                    1
                } else {
                    0
                };
                SqlValue::Integer(int_value)
            }
            _ => SqlValue::Integer(0),
        },
        Some(value) if matches!(field_type, "rating" | "duration") => match value {
            Value::Number(n) => SqlValue::Integer(n.as_i64().unwrap_or(0)),
            Value::String(s) => SqlValue::Integer(s.trim().parse::<i64>().unwrap_or(0)),
            Value::Bool(b) => SqlValue::Integer(if *b { 1 } else { 0 }),
            _ => SqlValue::Integer(0),
        },
        Some(value) if matches!(field_type, "number" | "currency" | "percent") => match value {
            Value::Number(n) => SqlValue::Real(n.as_f64().unwrap_or(0.0)),
            Value::String(s) => SqlValue::Real(s.trim().parse::<f64>().unwrap_or(0.0)),
            Value::Bool(b) => SqlValue::Real(if *b { 1.0 } else { 0.0 }),
            _ => SqlValue::Real(0.0),
        },
        Some(Value::String(text)) => SqlValue::Text(text.clone()),
        Some(Value::Number(number)) => SqlValue::Text(number.to_string()),
        Some(Value::Bool(flag)) => SqlValue::Text(if *flag { "1".to_string() } else { "0".to_string() }),
        Some(other) => SqlValue::Text(other.to_string()),
    }
}

// ── Row mapper ────────────────────────────────────────────────────────────────

fn row_to_record(row: &Row<'_>, fields: &[AppField]) -> rusqlite::Result<RecordRow> {
    let mut values: HashMap<String, Value> = HashMap::new();

    for (idx, field) in fields.iter().enumerate() {
        let col_index = idx + 3;
        let json_value = match field.field_type.as_str() {
            "checkbox" | "rating" | "duration" => {
                let v: Option<i64> = row.get(col_index)?;
                v.map(|n| Value::Number(n.into())).unwrap_or(Value::Null)
            }
            "number" | "currency" | "percent" => {
                let v: Option<f64> = row.get(col_index)?;
                match v {
                    Some(f) => serde_json::Number::from_f64(f)
                        .map(Value::Number)
                        .unwrap_or(Value::Null),
                    None => Value::Null,
                }
            }
            ft if table_service::is_computed_field_type(ft) => {
                // Computed fields may return any SQL type; handle generically
                let v: rusqlite::types::Value = row.get(col_index)?;
                sql_value_to_json(v)
            }
            _ => {
                let v: Option<String> = row.get(col_index)?;
                v.map(Value::String).unwrap_or(Value::Null)
            }
        };
        values.insert(field.column_key.clone(), json_value);
    }

    Ok(RecordRow {
        record_id: row.get(0)?,
        created_at: row.get(1)?,
        updated_at: row.get(2)?,
        values,
    })
}

// ── Computed field helpers ────────────────────────────────────────────────────

/// Returns column_key → (computed_type, config_json) for all computed fields in a table.
fn fetch_computed_configs(
    conn: &Connection,
    table_id: &str,
) -> Result<HashMap<String, (String, String)>> {
    let mut stmt = conn.prepare(
        "SELECT af.column_key, afc.computed_type, afc.config_json \
         FROM app_fields af \
         JOIN app_field_computed afc ON afc.field_id = af.id \
         WHERE af.table_id = ?1",
    )?;
    let map = stmt
        .query_map([table_id], |row| {
            Ok((row.get::<_, String>(0)?, (row.get::<_, String>(1)?, row.get::<_, String>(2)?)))
        })?
        .filter_map(|r| r.ok())
        .collect();
    Ok(map)
}

/// Look up a target table's storage_name and a target field's column_key.
fn resolve_target_info(
    conn: &Connection,
    target_table_id: &str,
    target_field_id: &str,
) -> Result<(String, String)> {
    let storage_name: String = conn.query_row(
        "SELECT storage_name FROM app_tables WHERE id = ?1",
        [target_table_id],
        |row| row.get(0),
    )?;
    let column_key: String = conn.query_row(
        "SELECT column_key FROM app_fields WHERE id = ?1",
        [target_field_id],
        |row| row.get(0),
    )?;
    Ok((storage_name, column_key))
}

/// Build a SQL expression for one computed field.
/// The outer query must alias the data table as `r`.
fn build_computed_expr(
    conn: &Connection,
    field: &AppField,
    computed_type: &str,
    config_json: &str,
    from_table_id: &str,
) -> String {
    let alias = quote_ident(&field.column_key);
    let fallback = format!("NULL AS {alias}");

    let config: serde_json::Value = match serde_json::from_str(config_json) {
        Ok(v) => v,
        Err(_) => return fallback,
    };

    match computed_type {
        "lookup" => {
            let target_table_id = match config["targetTableId"].as_str() {
                Some(s) => s,
                None => return fallback,
            };
            let target_field_id = match config["targetFieldId"].as_str() {
                Some(s) => s,
                None => return fallback,
            };
            match resolve_target_info(conn, target_table_id, target_field_id) {
                Ok((storage_name, column_key)) => format!(
                    "(SELECT dt.{col} FROM {tbl} dt \
                     JOIN record_links rl ON rl.to_record_id = dt.record_id \
                     WHERE rl.from_record_id = r.record_id \
                     AND rl.from_table_id = '{from_tbl}' \
                     AND rl.to_table_id = '{to_tbl}' \
                     LIMIT 1) AS {alias}",
                    col = quote_ident(&column_key),
                    tbl = quote_ident(&storage_name),
                    from_tbl = from_table_id,
                    to_tbl = target_table_id,
                ),
                Err(_) => fallback,
            }
        }
        "rollup" => {
            let target_table_id = match config["targetTableId"].as_str() {
                Some(s) => s,
                None => return fallback,
            };
            let target_field_id = match config["targetFieldId"].as_str() {
                Some(s) => s,
                None => return fallback,
            };
            let fn_name = config["fn"].as_str().unwrap_or("COUNT");
            let safe_fn = match fn_name {
                "COUNT" | "SUM" | "AVG" | "MIN" | "MAX" => fn_name,
                _ => "COUNT",
            };
            match resolve_target_info(conn, target_table_id, target_field_id) {
                Ok((storage_name, column_key)) => format!(
                    "(SELECT {fn}(dt.{col}) FROM {tbl} dt \
                     JOIN record_links rl ON rl.to_record_id = dt.record_id \
                     WHERE rl.from_record_id = r.record_id \
                     AND rl.from_table_id = '{from_tbl}' \
                     AND rl.to_table_id = '{to_tbl}') AS {alias}",
                    fn = safe_fn,
                    col = quote_ident(&column_key),
                    tbl = quote_ident(&storage_name),
                    from_tbl = from_table_id,
                    to_tbl = target_table_id,
                ),
                Err(_) => fallback,
            }
        }
        // Formula: NULL placeholder in SQL; Rust post-processing fills in the value
        _ => format!("NULL AS {alias}"),
    }
}

/// Build per-field SELECT expressions (plain column references or computed subqueries).
fn build_select_exprs(
    conn: &Connection,
    fields: &[AppField],
    table_id: &str,
    computed_configs: &HashMap<String, (String, String)>,
) -> Vec<String> {
    fields
        .iter()
        .map(|field| {
            if let Some((ctype, config_json)) = computed_configs.get(&field.column_key) {
                build_computed_expr(conn, field, ctype, config_json, table_id)
            } else {
                format!("r.{}", quote_ident(&field.column_key))
            }
        })
        .collect()
}

/// Evaluate a formula expression against a record's values using evalexpr.
fn eval_formula(expression: &str, values: &HashMap<String, Value>) -> Value {
    let mut ctx = evalexpr::HashMapContext::new();
    for (k, v) in values {
        let _ = match v {
            Value::Number(n) if n.is_f64() => {
                ctx.set_value(k.clone(), evalexpr::Value::Float(n.as_f64().unwrap_or(0.0)))
            }
            Value::Number(n) => {
                ctx.set_value(k.clone(), evalexpr::Value::Int(n.as_i64().unwrap_or(0)))
            }
            Value::String(s) => ctx.set_value(k.clone(), evalexpr::Value::String(s.clone())),
            _ => Ok(()),
        };
    }
    evalexpr::eval_with_context(expression, &ctx)
        .map(|v| match v {
            evalexpr::Value::Float(f) => serde_json::Number::from_f64(f)
                .map(Value::Number)
                .unwrap_or(Value::Null),
            evalexpr::Value::Int(i) => Value::Number(i.into()),
            evalexpr::Value::String(s) => Value::String(s),
            evalexpr::Value::Boolean(b) => Value::Bool(b),
            _ => Value::Null,
        })
        .unwrap_or(Value::Null)
}

/// Post-process formula fields: evaluate each formula expression against the record's values.
fn apply_formula_fields(
    records: &mut Vec<RecordRow>,
    fields: &[AppField],
    computed_configs: &HashMap<String, (String, String)>,
) {
    for field in fields.iter().filter(|f| f.field_type == "formula") {
        if let Some((_, config_json)) = computed_configs.get(&field.column_key) {
            if let Ok(config) = serde_json::from_str::<Value>(config_json) {
                if let Some(expression) = config["expression"].as_str() {
                    for record in records.iter_mut() {
                        let result = eval_formula(expression, &record.values);
                        record.values.insert(field.column_key.clone(), result);
                    }
                }
            }
        }
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

pub fn list_records(
    conn: &Connection,
    table_id: &str,
    query: Option<&str>,
    sorts: Option<&[SortInput]>,
    filters: Option<&[FilterInput]>,
) -> Result<Vec<RecordRow>> {
    let table = metadata_service::get_table(conn, table_id)?;
    let fields = metadata_service::list_fields(conn, table_id)?;
    let computed_configs = fetch_computed_configs(conn, table_id)?;
    let select_exprs = build_select_exprs(conn, &fields, table_id, &computed_configs);

    // Table is aliased as `r` so correlated subqueries can reference r.record_id
    let mut sql = format!(
        "SELECT r.record_id, r.created_at, r.updated_at{} FROM {} r",
        if select_exprs.is_empty() {
            String::new()
        } else {
            format!(", {}", select_exprs.join(", "))
        },
        quote_ident(&table.storage_name)
    );

    let mut params: Vec<String> = Vec::new();
    let mut where_clauses: Vec<String> = Vec::new();

    // Only physical (non-computed) fields are searchable / filterable / sortable
    let physical_fields: Vec<AppField> = fields
        .iter()
        .filter(|f| !table_service::is_computed_field_type(&f.field_type))
        .cloned()
        .collect();

    if let Some(text) = query {
        if let Some((clause, search_params)) =
            search_service::build_search_clause(&physical_fields, text)
        {
            where_clauses.push(clause);
            params.extend(search_params);
        }
    }

    if let Some(filter_list) = filters {
        if !filter_list.is_empty() {
            if let Some((clause, filter_params)) =
                filter_service::build_filter_clause(&physical_fields, filter_list)
            {
                where_clauses.push(clause);
                params.extend(filter_params);
            }
        }
    }

    if !where_clauses.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&where_clauses.join(" AND "));
    }

    let sort_clause = filter_service::build_sort_clause(&physical_fields, sorts.unwrap_or(&[]));
    sql.push_str(" ORDER BY ");
    sql.push_str(&sort_clause);

    let mut stmt = conn.prepare(&sql)?;
    let mut records = if params.is_empty() {
        stmt.query_map([], |row| row_to_record(row, &fields))?
            .collect::<std::result::Result<Vec<_>, _>>()?
    } else {
        let refs = params.iter().map(String::as_str).collect::<Vec<_>>();
        stmt.query_map(params_from_iter(refs), |row| row_to_record(row, &fields))?
            .collect::<std::result::Result<Vec<_>, _>>()?
    };

    apply_formula_fields(&mut records, &fields, &computed_configs);

    Ok(records)
}

pub fn create_record(
    conn: &Connection,
    table_id: &str,
    values: &HashMap<String, Value>,
) -> Result<RecordRow> {
    let table = metadata_service::get_table(conn, table_id)?;
    let fields = metadata_service::list_fields(conn, table_id)?;
    let now = now_iso();
    let record_id = crate::db::generate_id("rec");

    let mut columns = vec![
        quote_ident("record_id"),
        quote_ident("created_at"),
        quote_ident("updated_at"),
    ];

    let mut placeholders = vec!["?".to_string(), "?".to_string(), "?".to_string()];
    let mut sql_values: Vec<SqlValue> = vec![
        SqlValue::Text(record_id.clone()),
        SqlValue::Text(now.clone()),
        SqlValue::Text(now.clone()),
    ];

    for field in &fields {
        // Computed fields have no physical column — skip them in INSERT
        if table_service::is_computed_field_type(&field.field_type) {
            continue;
        }
        columns.push(quote_ident(&field.column_key));
        placeholders.push("?".to_string());
        sql_values.push(json_to_sql(values.get(&field.column_key), &field.field_type));
    }

    let sql = format!(
        "INSERT INTO {} ({}) VALUES ({})",
        quote_ident(&table.storage_name),
        columns.join(", "),
        placeholders.join(", ")
    );

    conn.execute(&sql, params_from_iter(sql_values.iter()))?;

    get_record(conn, table_id, &record_id)
}

pub fn update_record(
    conn: &Connection,
    table_id: &str,
    record_id: &str,
    values: &HashMap<String, Value>,
) -> Result<RecordRow> {
    let table = metadata_service::get_table(conn, table_id)?;
    let fields = metadata_service::list_fields(conn, table_id)?;

    if values.is_empty() {
        return get_record(conn, table_id, record_id);
    }

    // Only physical fields can be updated; computed fields are derived at read time
    let field_map = fields
        .iter()
        .filter(|f| !table_service::is_computed_field_type(&f.field_type))
        .map(|field| (field.column_key.clone(), field))
        .collect::<HashMap<_, _>>();

    let mut sets: Vec<String> = vec![format!("{} = ?", quote_ident("updated_at"))];
    let mut sql_values: Vec<SqlValue> = vec![SqlValue::Text(now_iso())];

    for (column_key, value) in values {
        if let Some(field) = field_map.get(column_key) {
            sets.push(format!("{} = ?", quote_ident(column_key)));
            sql_values.push(json_to_sql(Some(value), &field.field_type));
        }
    }

    if sets.len() == 1 {
        return get_record(conn, table_id, record_id);
    }

    sql_values.push(SqlValue::Text(record_id.to_string()));

    let sql = format!(
        "UPDATE {} SET {} WHERE record_id = ?",
        quote_ident(&table.storage_name),
        sets.join(", ")
    );

    conn.execute(&sql, params_from_iter(sql_values.iter()))?;

    get_record(conn, table_id, record_id)
}

pub fn delete_record(conn: &Connection, table_id: &str, record_id: &str) -> Result<()> {
    let table = metadata_service::get_table(conn, table_id)?;
    let sql = format!("DELETE FROM {} WHERE record_id = ?", quote_ident(&table.storage_name));
    conn.execute(&sql, [record_id])?;
    Ok(())
}

pub fn get_record(conn: &Connection, table_id: &str, record_id: &str) -> Result<RecordRow> {
    let table = metadata_service::get_table(conn, table_id)?;
    let fields = metadata_service::list_fields(conn, table_id)?;
    let computed_configs = fetch_computed_configs(conn, table_id)?;
    let select_exprs = build_select_exprs(conn, &fields, table_id, &computed_configs);

    let sql = format!(
        "SELECT r.record_id, r.created_at, r.updated_at{} FROM {} r WHERE r.record_id = ?",
        if select_exprs.is_empty() {
            String::new()
        } else {
            format!(", {}", select_exprs.join(", "))
        },
        quote_ident(&table.storage_name)
    );

    let mut record = conn
        .query_row(&sql, [record_id], |row| row_to_record(row, &fields))
        .optional()?
        .ok_or_else(|| anyhow!("Record not found"))?;

    // Post-process formula fields for this single record
    let mut records = vec![record];
    apply_formula_fields(&mut records, &fields, &computed_configs);
    record = records.remove(0);

    Ok(record)
}
