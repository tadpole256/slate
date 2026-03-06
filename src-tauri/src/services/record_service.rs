use std::collections::HashMap;

use anyhow::{anyhow, Result};
use rusqlite::{params_from_iter, types::Value as SqlValue, Connection, OptionalExtension, Row};
use serde_json::Value;

use crate::db::{quote_ident, now_iso};
use crate::models::{AppField, RecordRow};
use crate::services::{metadata_service, search_service};

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
        Some(Value::String(text)) => SqlValue::Text(text.clone()),
        Some(Value::Number(number)) => SqlValue::Text(number.to_string()),
        Some(Value::Bool(flag)) => SqlValue::Text(if *flag { "1".to_string() } else { "0".to_string() }),
        Some(other) => SqlValue::Text(other.to_string()),
    }
}

fn row_to_record(row: &Row<'_>, fields: &[AppField]) -> rusqlite::Result<RecordRow> {
    let mut values: HashMap<String, Value> = HashMap::new();

    for (idx, field) in fields.iter().enumerate() {
        let col_index = idx + 3;
        if field.field_type == "checkbox" {
            let value: Option<i64> = row.get(col_index)?;
            if let Some(number) = value {
                values.insert(field.column_key.clone(), Value::Number(number.into()));
            } else {
                values.insert(field.column_key.clone(), Value::Null);
            }
        } else {
            let value: Option<String> = row.get(col_index)?;
            if let Some(text) = value {
                values.insert(field.column_key.clone(), Value::String(text));
            } else {
                values.insert(field.column_key.clone(), Value::Null);
            }
        }
    }

    Ok(RecordRow {
        record_id: row.get(0)?,
        created_at: row.get(1)?,
        updated_at: row.get(2)?,
        values,
    })
}

pub fn list_records(conn: &Connection, table_id: &str, query: Option<&str>) -> Result<Vec<RecordRow>> {
    let table = metadata_service::get_table(conn, table_id)?;
    let fields = metadata_service::list_fields(conn, table_id)?;

    let selected_columns = fields
        .iter()
        .map(|field| quote_ident(&field.column_key))
        .collect::<Vec<_>>();

    let mut sql = format!(
        "SELECT record_id, created_at, updated_at{} FROM {}",
        if selected_columns.is_empty() {
            String::new()
        } else {
            format!(", {}", selected_columns.join(", "))
        },
        quote_ident(&table.storage_name)
    );

    let mut params: Vec<String> = Vec::new();

    if let Some(text) = query {
        if let Some((clause, search_params)) = search_service::build_search_clause(&fields, text) {
            sql.push_str(" WHERE ");
            sql.push_str(&clause);
            params = search_params;
        }
    }

    sql.push_str(" ORDER BY updated_at DESC");

    let mut stmt = conn.prepare(&sql)?;
    let records = if params.is_empty() {
        stmt.query_map([], |row| row_to_record(row, &fields))?
            .collect::<std::result::Result<Vec<_>, _>>()?
    } else {
        let refs = params.iter().map(String::as_str).collect::<Vec<_>>();
        stmt.query_map(params_from_iter(refs), |row| row_to_record(row, &fields))?
            .collect::<std::result::Result<Vec<_>, _>>()?
    };

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

    let field_map = fields
        .iter()
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

    let selected_columns = fields
        .iter()
        .map(|field| quote_ident(&field.column_key))
        .collect::<Vec<_>>();

    let sql = format!(
        "SELECT record_id, created_at, updated_at{} FROM {} WHERE record_id = ?",
        if selected_columns.is_empty() {
            String::new()
        } else {
            format!(", {}", selected_columns.join(", "))
        },
        quote_ident(&table.storage_name)
    );

    conn.query_row(&sql, [record_id], |row| row_to_record(row, &fields))
        .optional()?
        .ok_or_else(|| anyhow!("Record not found"))
}
