use std::collections::HashMap;

use rusqlite::Connection;
use serde_json::{json, Value};

use crate::db;
use crate::services::{link_service, metadata_service, record_service, table_service};

fn setup_connection() -> Connection {
    let conn = Connection::open_in_memory().expect("open in-memory sqlite");
    db::init::initialize_database(&conn).expect("initialize schema and seeds");
    conn
}

fn field_key(fields: &[crate::models::AppField], name: &str) -> String {
    fields
        .iter()
        .find(|field| field.display_name == name)
        .map(|field| field.column_key.clone())
        .expect("field should exist")
}

#[test]
fn database_init_seeds_workspace_metadata() {
    let conn = setup_connection();

    let tables = metadata_service::list_tables(&conn).expect("list tables");
    assert_eq!(tables.len(), 4);

    let names = tables.iter().map(|table| table.display_name.as_str()).collect::<Vec<_>>();
    assert!(names.contains(&"Contacts"));
    assert!(names.contains(&"Notes"));
    assert!(names.contains(&"Projects"));
    assert!(names.contains(&"Ideas"));

    let links_table_exists: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = 'record_links'",
            [],
            |row| row.get(0),
        )
        .expect("query sqlite_master");
    assert_eq!(links_table_exists, 1);

    let contacts = tables
        .iter()
        .find(|table| table.display_name == "Contacts")
        .expect("contacts table should be seeded");
    let contact_fields = metadata_service::list_fields(&conn, &contacts.id).expect("list contact fields");
    assert_eq!(contact_fields.len(), 4);
    assert_eq!(contact_fields[0].display_name, "Name");
}

#[test]
fn backend_crud_search_and_links_work() {
    let conn = setup_connection();

    let people = table_service::create_table(&conn, "People").expect("create table");
    let people_storage = people.storage_name.clone();

    // Simulate an out-of-sync workspace where metadata exists but the physical table is missing.
    conn.execute(
        &format!("DROP TABLE IF EXISTS \"{}\"", people_storage),
        [],
    )
    .expect("drop physical table to simulate corruption");

    let email_field = table_service::create_field(&conn, &people.id, "Email", "text")
        .expect("create email field");
    let active_field = table_service::create_field(&conn, &people.id, "Active", "checkbox")
        .expect("create active field");

    let fields = metadata_service::list_fields(&conn, &people.id).expect("list people fields");
    let name_key = field_key(&fields, "Name");
    let email_key = field_key(&fields, "Email");
    let active_key = field_key(&fields, "Active");

    let mut values: HashMap<String, Value> = HashMap::new();
    values.insert(name_key.clone(), json!("Alice Chen"));
    values.insert(email_key.clone(), json!("alice@initial.dev"));
    values.insert(active_key.clone(), json!(1));

    let created = record_service::create_record(&conn, &people.id, &values).expect("create record");
    assert_eq!(created.values.get(&name_key), Some(&json!("Alice Chen")));

    let mut updates: HashMap<String, Value> = HashMap::new();
    updates.insert(email_key.clone(), json!("alice@updated.dev"));
    let updated =
        record_service::update_record(&conn, &people.id, &created.record_id, &updates).expect("update record");
    assert_eq!(updated.values.get(&email_key), Some(&json!("alice@updated.dev")));

    let filtered = record_service::list_records(&conn, &people.id, Some("updated.dev"))
        .expect("search should succeed");
    assert_eq!(filtered.len(), 1);

    let empty =
        record_service::list_records(&conn, &people.id, Some("this-will-not-match")).expect("search should work");
    assert_eq!(empty.len(), 0);

    let projects = table_service::create_table(&conn, "Projects").expect("create projects table");
    let project_fields = metadata_service::list_fields(&conn, &projects.id).expect("project fields");
    let project_name_key = field_key(&project_fields, "Name");

    let mut project_values = HashMap::new();
    project_values.insert(project_name_key, json!("Apollo"));
    let project_record =
        record_service::create_record(&conn, &projects.id, &project_values).expect("create project record");

    link_service::create_link(
        &conn,
        &people.id,
        &created.record_id,
        &projects.id,
        &project_record.record_id,
        Some("related"),
    )
    .expect("create generalized link");

    let link_count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM record_links WHERE from_table_id = ?1 AND from_record_id = ?2",
            (&people.id, &created.record_id),
            |row| row.get(0),
        )
        .expect("count links");
    assert_eq!(link_count, 1);

    table_service::delete_field(&conn, &email_field.id).expect("delete email field");
    table_service::delete_field(&conn, &active_field.id).expect("delete active field");

    let remaining_fields = metadata_service::list_fields(&conn, &people.id).expect("list remaining fields");
    assert_eq!(remaining_fields.len(), 1);

    let delete_last_attempt = table_service::delete_field(&conn, &remaining_fields[0].id);
    assert!(delete_last_attempt.is_err());

    record_service::delete_record(&conn, &people.id, &created.record_id).expect("delete record");
    let rows_after_delete = record_service::list_records(&conn, &people.id, None).expect("list after delete");
    assert_eq!(rows_after_delete.len(), 0);

    table_service::delete_table(&conn, &people.id).expect("delete table");
    let storage_exists: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM sqlite_master WHERE type = 'table' AND name = ?1",
            [people_storage],
            |row| row.get(0),
        )
        .expect("check storage table exists");
    assert_eq!(storage_exists, 0);
}
