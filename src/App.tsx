import { useEffect, useState } from "react";
import { AddColumnModal } from "./components/common/AddColumnModal";
import { CommandPalette } from "./components/common/CommandPalette";
import { CreateTableModal } from "./components/common/CreateTableModal";
import { AppLayout } from "./components/layout/AppLayout";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { ExpandedRecordModal } from "./components/record/ExpandedRecordModal";
import { RecordDetailPanel } from "./components/record/RecordDetailPanel";
import { MainTableView } from "./components/table/MainTableView";
import { AddViewModal } from "./components/views/AddViewModal";
import { CalendarView } from "./components/views/CalendarView";
import { GalleryView } from "./components/views/GalleryView";
import { KanbanView } from "./components/views/KanbanView";
import { ViewTabsBar } from "./components/views/ViewTabsBar";
import { useWorkspaceStore } from "./store/workspaceStore";
import type { RowHeight, ViewType } from "./types/slate";

let hasInitialized = false;

export default function App() {
  const {
    loading,
    error,
    tables,
    fieldsByTable,
    recordsByTable,
    linksByRecord,
    recordOptionsByTable,
    linksLoading,
    recordOptionsLoading,
    attachmentsByRecord,
    attachmentsLoading,
    activeTableId,
    selectedRecordId,
    searchQuery,
    createTableModalOpen,
    addColumnModalOpen,
    debugLogs,
    initialize,
    forceStartupFailure,
    setActiveTable,
    setSearchQuery,
    selectRecord,
    setCreateTableModalOpen,
    setAddColumnModalOpen,
    createTable,
    renameTable,
    deleteTable,
    createField,
    renameField,
    deleteField,
    createRecord,
    updateRecordCell,
    updateRecordValues,
    deleteRecord,
    createRecordLink,
    deleteRecordLink,
    loadRecordOptions,
    attachFileToRecord,
    deleteAttachment,
    openAttachment,
    fieldOptionsByField,
    sortsByTable,
    filtersByTable,
    viewsByTable,
    activeViewIdByTable,
    hiddenFieldIdsByTable,
    rowHeightByTable,
    kanbanGroupByFieldIdByTable,
    groupByFieldIdByTable,
    calendarDateFieldIdByTable,
    createFieldOption,
    setSorts,
    setFilters,
    toggleFieldVisibility,
    setActiveView,
    createView,
    renameView,
    deleteView,
    setRowHeight,
    setKanbanGroupByField,
    setGroupByField,
    setCalendarDateField,
    bulkDeleteRecords,
    exportCsvTable,
    importCsvToTable,
  } = useWorkspaceStore();

  const [addViewModalOpen, setAddViewModalOpen] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  const activeTable = tables.find((table) => table.id === activeTableId) ?? null;
  const activeFields = activeTableId ? fieldsByTable[activeTableId] ?? [] : [];
  const activeRecords = activeTableId ? recordsByTable[activeTableId] ?? [] : [];
  const activeSorts = activeTableId ? sortsByTable[activeTableId] ?? [] : [];
  const activeFilters = activeTableId ? filtersByTable[activeTableId] ?? [] : [];
  const activeViews = activeTableId ? viewsByTable[activeTableId] ?? [] : [];
  const activeViewId = activeTableId ? activeViewIdByTable[activeTableId] ?? null : null;
  const activeHiddenFieldIds = activeTableId ? hiddenFieldIdsByTable[activeTableId] ?? [] : [];
  const activeRowHeight: RowHeight = activeTableId ? rowHeightByTable[activeTableId] ?? "default" : "default";
  const activeKanbanGroupByFieldId = activeTableId ? kanbanGroupByFieldIdByTable[activeTableId] ?? null : null;
  const activeGroupByFieldId = activeTableId ? groupByFieldIdByTable[activeTableId] ?? null : null;
  const activeCalendarDateFieldId = activeTableId ? calendarDateFieldIdByTable[activeTableId] ?? null : null;
  const activeView = activeViews.find((v) => v.id === activeViewId) ?? null;

  const selectedRecord =
    activeRecords.find((record) => record.record_id === selectedRecordId) ?? null;
  const expandedRecord =
    expandedRecordId !== null
      ? activeRecords.find((r) => r.record_id === expandedRecordId) ?? null
      : null;
  const selectedRecordAttachments =
    activeTableId && selectedRecordId
      ? attachmentsByRecord[`${activeTableId}:${selectedRecordId}`] ?? []
      : [];
  const selectedRecordLinks =
    activeTableId && selectedRecordId ? linksByRecord[`${activeTableId}:${selectedRecordId}`] ?? [] : [];

  const openLink = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
    const normalized = hasScheme ? trimmed : `https://${trimmed}`;
    window.open(normalized, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!hasInitialized) {
      hasInitialized = true;
      void initialize();
    }
  }, [initialize]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    const watchdog = setTimeout(() => {
      forceStartupFailure(
        "Slate startup is taking too long. Try restarting the app. If this repeats, remove the local slate.db file in your app data directory."
      );
    }, 12000);

    return () => clearTimeout(watchdog);
  }, [loading, forceStartupFailure]);

  // Cmd+K global listener for command palette
  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  function handleExpandRecord(recordId: string) {
    setExpandedRecordId(recordId);
    selectRecord(recordId);
  }

  function handleCloseExpandedRecord() {
    setExpandedRecordId(null);
  }

  const viewType: ViewType = (activeView?.view_type ?? "grid") as ViewType;

  // Shared toolbar props reused across view types
  const sharedToolbarProps = {
    rowHeight: activeRowHeight,
    onSetRowHeight: (height: RowHeight) => {
      if (activeTableId) void setRowHeight(activeTableId, height);
    },
    onExportCsv: () => {
      if (activeTableId) void exportCsvTable(activeTableId);
    },
    onImportCsv: () => {
      if (activeTableId) void importCsvToTable(activeTableId);
    },
  };

  // Common MainTableView stub used in gallery/kanban (toolbar only, no data rows)
  function renderToolbarStub() {
    return (
      <MainTableView
        table={activeTable}
        fields={activeFields}
        records={[]}
        fieldOptionsByField={fieldOptionsByField}
        sorts={activeSorts}
        filters={activeFilters}
        hiddenFieldIds={activeHiddenFieldIds}
        selectedRecordId={selectedRecordId}
        groupByFieldId={null}
        onSelectRecord={selectRecord}
        onExpandRecord={handleExpandRecord}
        onCellChange={() => {}}
        onOpenLink={openLink}
        onAddColumn={() => setAddColumnModalOpen(true)}
        onAddRow={() => {
          if (activeTableId) void createRecord(activeTableId);
        }}
        onRenameField={(field) => {
          const nextName = window.prompt("Rename column", field.display_name);
          if (nextName) void renameField(field.id, nextName);
        }}
        onDeleteField={(field) => {
          if (window.confirm(`Delete column "${field.display_name}"?`)) void deleteField(field.id);
        }}
        onSortsChange={(sorts) => { if (activeTableId) setSorts(activeTableId, sorts); }}
        onFiltersChange={(filters) => { if (activeTableId) setFilters(activeTableId, filters); }}
        onToggleFieldVisibility={(fieldId) => void toggleFieldVisibility(fieldId)}
        onSetGroupByField={() => {}}
        onBulkDelete={() => {}}
        {...sharedToolbarProps}
      />
    );
  }

  function renderMainContent() {
    if (!activeTable) {
      return (
        <MainTableView
          table={null}
          fields={[]}
          records={[]}
          fieldOptionsByField={fieldOptionsByField}
          sorts={[]}
          filters={[]}
          hiddenFieldIds={[]}
          rowHeight="default"
          groupByFieldId={null}
          selectedRecordId={null}
          onSelectRecord={selectRecord}
          onCellChange={() => {}}
          onOpenLink={openLink}
          onAddColumn={() => setAddColumnModalOpen(true)}
          onAddRow={() => {}}
          onRenameField={() => {}}
          onDeleteField={() => {}}
          onSortsChange={() => {}}
          onFiltersChange={() => {}}
          onToggleFieldVisibility={() => {}}
          onSetRowHeight={() => {}}
          onSetGroupByField={() => {}}
          onBulkDelete={() => {}}
          onExportCsv={() => {}}
          onImportCsv={() => {}}
        />
      );
    }

    if (viewType === "gallery") {
      return (
        <div className="gallery-view-wrap">
          {renderToolbarStub()}
          <GalleryView
            fields={activeFields.filter((f) => !activeHiddenFieldIds.includes(f.id))}
            records={activeRecords}
            fieldOptionsByField={fieldOptionsByField}
            selectedRecordId={selectedRecordId}
            onSelectRecord={selectRecord}
          />
          <button className="add-row-bar" onClick={() => { if (activeTableId) void createRecord(activeTableId); }}>
            + New Row
          </button>
        </div>
      );
    }

    if (viewType === "kanban") {
      return (
        <div className="kanban-view-wrap">
          {renderToolbarStub()}
          <KanbanView
            fields={activeFields.filter((f) => !activeHiddenFieldIds.includes(f.id))}
            records={activeRecords}
            fieldOptionsByField={fieldOptionsByField}
            selectedRecordId={selectedRecordId}
            groupByFieldId={activeKanbanGroupByFieldId}
            onSelectRecord={selectRecord}
            onSetGroupByField={(fieldId) => {
              if (activeTableId) void setKanbanGroupByField(activeTableId, fieldId);
            }}
          />
        </div>
      );
    }

    if (viewType === "calendar") {
      return (
        <div className="calendar-view-wrap">
          {renderToolbarStub()}
          <CalendarView
            fields={activeFields}
            records={activeRecords}
            fieldOptionsByField={fieldOptionsByField}
            calendarDateFieldId={activeCalendarDateFieldId}
            onSetCalendarDateField={(fieldId) => {
              if (activeTableId) void setCalendarDateField(activeTableId, fieldId);
            }}
            onSelectRecord={selectRecord}
            onExpandRecord={handleExpandRecord}
          />
        </div>
      );
    }

    // Default: grid view
    return (
      <MainTableView
        table={activeTable}
        fields={activeFields}
        records={activeRecords}
        fieldOptionsByField={fieldOptionsByField}
        sorts={activeSorts}
        filters={activeFilters}
        hiddenFieldIds={activeHiddenFieldIds}
        selectedRecordId={selectedRecordId}
        groupByFieldId={activeGroupByFieldId}
        onSelectRecord={selectRecord}
        onExpandRecord={handleExpandRecord}
        onCellChange={(recordId, columnKey, value) => {
          if (activeTableId) {
            void updateRecordCell(activeTableId, recordId, columnKey, value);
          }
        }}
        onOpenLink={openLink}
        onAddColumn={() => setAddColumnModalOpen(true)}
        onAddRow={() => {
          if (activeTableId) {
            void createRecord(activeTableId);
          }
        }}
        onRenameField={(field) => {
          const nextName = window.prompt("Rename column", field.display_name);
          if (nextName) {
            void renameField(field.id, nextName);
          }
        }}
        onDeleteField={(field) => {
          if (window.confirm(`Delete column "${field.display_name}"?`)) {
            void deleteField(field.id);
          }
        }}
        onSortsChange={(sorts) => {
          if (activeTableId) setSorts(activeTableId, sorts);
        }}
        onFiltersChange={(filters) => {
          if (activeTableId) setFilters(activeTableId, filters);
        }}
        onToggleFieldVisibility={(fieldId) => void toggleFieldVisibility(fieldId)}
        onSetGroupByField={(fieldId) => {
          if (activeTableId) void setGroupByField(activeTableId, fieldId);
        }}
        onBulkDelete={(recordIds) => {
          if (activeTableId && window.confirm(`Delete ${recordIds.length} record(s)?`)) {
            void bulkDeleteRecords(activeTableId, recordIds);
          }
        }}
        {...sharedToolbarProps}
      />
    );
  }

  return (
    <>
      <AppLayout
        topBar={
          <TopBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onAddRecord={() => {
              if (activeTableId) {
                void createRecord(activeTableId);
              }
            }}
            onAddTable={() => setCreateTableModalOpen(true)}
            disableAddRecord={!activeTableId}
          />
        }
        sidebar={
          <Sidebar
            tables={tables}
            activeTableId={activeTableId}
            onSelectTable={(tableId) => {
              void setActiveTable(tableId);
            }}
            onAddTable={() => setCreateTableModalOpen(true)}
            onRenameTable={(tableId, currentName) => {
              const nextName = window.prompt("Rename table", currentName);
              if (nextName) {
                void renameTable(tableId, nextName);
              }
            }}
            onDeleteTable={(tableId, currentName) => {
              if (window.confirm(`Delete table "${currentName}" and all records?`)) {
                void deleteTable(tableId);
              }
            }}
          />
        }
        main={
          <div className="main-content-wrap">
            {activeTableId && activeViews.length > 0 && (
              <ViewTabsBar
                views={activeViews}
                activeViewId={activeViewId}
                onSelectView={(viewId) => {
                  if (activeTableId) setActiveView(activeTableId, viewId);
                }}
                onAddView={() => setAddViewModalOpen(true)}
                onRenameView={(viewId, currentName) => {
                  const nextName = window.prompt("Rename view", currentName);
                  if (nextName && activeTableId) {
                    void renameView(viewId, activeTableId, nextName);
                  }
                }}
                onDeleteView={(viewId) => {
                  if (activeTableId && window.confirm("Delete this view?")) {
                    void deleteView(activeTableId, viewId);
                  }
                }}
              />
            )}
            {renderMainContent()}
          </div>
        }
        detail={
          <RecordDetailPanel
            table={activeTable}
            fields={activeFields}
            selectedRecord={selectedRecord}
            onFieldChange={(columnKey, value) => {
              if (activeTableId && selectedRecordId) {
                void updateRecordValues(activeTableId, selectedRecordId, {
                  [columnKey]: value
                });
              }
            }}
            attachments={selectedRecordAttachments}
            attachmentsLoading={attachmentsLoading}
            onAttachFile={() => {
              if (activeTableId && selectedRecordId) {
                void attachFileToRecord(activeTableId, selectedRecordId);
              }
            }}
            onOpenAttachment={openAttachment}
            onDeleteAttachment={(attachmentId) => {
              if (activeTableId && selectedRecordId) {
                void deleteAttachment(activeTableId, selectedRecordId, attachmentId);
              }
            }}
            onOpenLink={openLink}
            tables={tables}
            links={selectedRecordLinks}
            linksLoading={linksLoading}
            recordOptionsByTable={recordOptionsByTable}
            recordOptionsLoading={recordOptionsLoading}
            onLoadRecordOptions={loadRecordOptions}
            onCreateRecordLink={(toTableId, toRecordId) => {
              if (activeTableId && selectedRecordId) {
                void createRecordLink(activeTableId, selectedRecordId, toTableId, toRecordId);
              }
            }}
            onDeleteRecordLink={(linkId) => {
              if (activeTableId && selectedRecordId) {
                void deleteRecordLink(activeTableId, selectedRecordId, linkId);
              }
            }}
            onOpenLinkedRecord={(toTableId, toRecordId) => {
              void (async () => {
                await setActiveTable(toTableId);
                selectRecord(toRecordId);
              })();
            }}
            onDeleteRecord={() => {
              if (activeTableId && selectedRecordId && window.confirm("Delete this record?")) {
                void deleteRecord(activeTableId, selectedRecordId);
              }
            }}
            fieldOptionsByField={fieldOptionsByField}
            onCreateFieldOption={async (fieldId, label) => {
              await createFieldOption(fieldId, label);
            }}
          />
        }
      />

      <CreateTableModal
        open={createTableModalOpen}
        onClose={() => setCreateTableModalOpen(false)}
        onSubmit={(name) => {
          void createTable(name);
        }}
      />

      <AddColumnModal
        open={addColumnModalOpen}
        onClose={() => setAddColumnModalOpen(false)}
        onSubmit={(name, type, computedConfig) => {
          if (activeTableId) {
            void createField(activeTableId, name, type, computedConfig);
          }
        }}
        tables={tables}
        fieldsByTable={fieldsByTable}
        currentTableId={activeTableId ?? undefined}
      />

      <AddViewModal
        open={addViewModalOpen}
        onClose={() => setAddViewModalOpen(false)}
        onSubmit={(name, viewType) => {
          if (activeTableId) {
            void createView(activeTableId, name, viewType);
          }
        }}
      />

      <CommandPalette
        open={commandPaletteOpen}
        tables={tables}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectTable={(tableId) => void setActiveTable(tableId)}
        onCreateTable={() => setCreateTableModalOpen(true)}
      />

      {expandedRecord && (
        <ExpandedRecordModal
          record={expandedRecord}
          fields={activeFields}
          fieldOptionsByField={fieldOptionsByField}
          onFieldChange={(columnKey, value) => {
            if (activeTableId && expandedRecordId) {
              void updateRecordValues(activeTableId, expandedRecordId, { [columnKey]: value });
            }
          }}
          onClose={handleCloseExpandedRecord}
          onDelete={() => {
            if (activeTableId && expandedRecordId && window.confirm("Delete this record?")) {
              void deleteRecord(activeTableId, expandedRecordId);
            }
          }}
          onOpenLink={openLink}
          onCreateFieldOption={async (fieldId, label) => {
            await createFieldOption(fieldId, label);
          }}
        />
      )}

      {loading && !error ? (
        <div className="loading-overlay" style={{ flexDirection: 'column', alignItems: 'stretch', padding: '1rem', minWidth: '350px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <div className="loading-spinner" aria-hidden="true" />
            <span>Loading Slate...</span>
          </div>
          <div style={{ fontSize: '11px', color: '#ffd700', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto', textAlign: 'left', background: 'rgba(0,0,0,0.5)', padding: '0.5rem', borderRadius: '4px' }}>
            {debugLogs.length === 0 ? "Waiting for logs..." : debugLogs.join("\n")}
          </div>
        </div>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}
    </>
  );
}
