use crate::db::quote_ident;
use crate::models::{AppField, FilterInput, SortInput};

/// Build a WHERE clause fragment and parameter list for the given filters.
/// Returns None when there are no applicable filters.
pub fn build_filter_clause(
    fields: &[AppField],
    filters: &[FilterInput],
) -> Option<(String, Vec<String>)> {
    let field_map: std::collections::HashMap<&str, &AppField> =
        fields.iter().map(|f| (f.id.as_str(), f)).collect();

    let mut clauses: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();

    for filter in filters {
        let field = match field_map.get(filter.field_id.as_str()) {
            Some(f) => f,
            None => continue,
        };
        let col = quote_ident(&field.column_key);

        match filter.op.as_str() {
            "is_empty" => {
                clauses.push(format!("({col} IS NULL OR CAST({col} AS TEXT) = '')"));
            }
            "is_not_empty" => {
                clauses.push(format!("({col} IS NOT NULL AND CAST({col} AS TEXT) != '')"));
            }
            "eq" => {
                if let Some(val) = &filter.value {
                    clauses.push(format!("CAST({col} AS TEXT) = ?"));
                    params.push(val.clone());
                }
            }
            "neq" => {
                if let Some(val) = &filter.value {
                    clauses.push(format!("(CAST({col} AS TEXT) != ? OR {col} IS NULL)"));
                    params.push(val.clone());
                }
            }
            "contains" => {
                if let Some(val) = &filter.value {
                    clauses.push(format!("CAST({col} AS TEXT) LIKE ?"));
                    params.push(format!("%{}%", val));
                }
            }
            "not_contains" => {
                if let Some(val) = &filter.value {
                    clauses.push(format!(
                        "(CAST({col} AS TEXT) NOT LIKE ? OR {col} IS NULL)"
                    ));
                    params.push(format!("%{}%", val));
                }
            }
            "gt" => {
                if let Some(val) = &filter.value {
                    clauses.push(format!("CAST({col} AS REAL) > ?"));
                    params.push(val.clone());
                }
            }
            "lt" => {
                if let Some(val) = &filter.value {
                    clauses.push(format!("CAST({col} AS REAL) < ?"));
                    params.push(val.clone());
                }
            }
            "gte" => {
                if let Some(val) = &filter.value {
                    clauses.push(format!("CAST({col} AS REAL) >= ?"));
                    params.push(val.clone());
                }
            }
            "lte" => {
                if let Some(val) = &filter.value {
                    clauses.push(format!("CAST({col} AS REAL) <= ?"));
                    params.push(val.clone());
                }
            }
            _ => {}
        }
    }

    if clauses.is_empty() {
        return None;
    }

    Some((clauses.join(" AND "), params))
}

/// Build an ORDER BY clause for the given sorts.
/// Falls back to `ORDER BY updated_at DESC` when sorts is empty.
pub fn build_sort_clause(fields: &[AppField], sorts: &[SortInput]) -> String {
    if sorts.is_empty() {
        return "updated_at DESC".to_string();
    }

    let field_map: std::collections::HashMap<&str, &AppField> =
        fields.iter().map(|f| (f.id.as_str(), f)).collect();

    let mut parts: Vec<String> = Vec::new();

    for sort in sorts {
        if let Some(field) = field_map.get(sort.field_id.as_str()) {
            let dir = if sort.direction.to_ascii_lowercase() == "asc" {
                "ASC"
            } else {
                "DESC"
            };
            parts.push(format!("{} {}", quote_ident(&field.column_key), dir));
        }
    }

    if parts.is_empty() {
        "updated_at DESC".to_string()
    } else {
        parts.join(", ")
    }
}
