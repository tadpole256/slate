use crate::db::quote_ident;
use crate::models::AppField;

pub fn build_search_clause(fields: &[AppField], query: &str) -> Option<(String, Vec<String>)> {
    let needle = query.trim();
    if needle.is_empty() {
        return None;
    }

    let searchable = fields
        .iter()
        .filter(|field| matches!(field.field_type.as_str(), "text" | "long_text" | "date"))
        .map(|field| format!("CAST({} AS TEXT) LIKE ?", quote_ident(&field.column_key)))
        .collect::<Vec<_>>();

    if searchable.is_empty() {
        return None;
    }

    let clause = format!("({})", searchable.join(" OR "));
    let params = (0..searchable.len())
        .map(|_| format!("%{}%", needle))
        .collect::<Vec<_>>();

    Some((clause, params))
}
