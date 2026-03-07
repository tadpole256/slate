import { useEffect, useState } from "react";
import { AddColumnModal } from "./components/common/AddColumnModal";
import { CreateTableModal } from "./components/common/CreateTableModal";
import { AppLayout } from "./components/layout/AppLayout";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { RecordDetailPanel } from "./components/record/RecordDetailPanel";
import { MainTableView } from "./components/table/MainTableView";
import { AddViewModal } from "./components/views/AddViewModal";
import { GalleryView } from "./components/views/GalleryView";
import { KanbanView } from "./components/views/KanbanView";
import { ViewTabsBar } from "./components/views/ViewTabsBar";
import { useWorkspaceStore } from "./store/workspaceStore";
import type { ViewType } from "./types/slate";

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
    createFieldOption,
    setSorts,
    setFilters,
    toggleFieldVisibility,
    setActiveView,
    createView,
    renameView,
    deleteView,
  } = useWorkspaceStore();

  const [addViewModalOpen, setAddViewModalOpen] = useState(false);

  const activeTable = tables.find((table) => table.id === activeTableId) ?? null;
  const activeFields = activeTableId ? fieldsByTable[activeTableId] ?? [] : [];
  const activeRecords = activeTableId ? recordsByTable[activeTableId] ?? [] : [];
  const activeSorts = activeTableId ? sortsByTable[activeTableId] ?? [] : [];
  const activeFilters = activeTableId ? filtersByTable[activeTableId] ?? [] : [];
  const activeViews = activeTableId ? viewsByTable[activeTableId] ?? [] : [];
  const activeViewId = activeTableId ? activeViewIdByTable[activeTableId] ?? null : null;
  const activeHiddenFieldIds = activeTableId ? hiddenFieldIdsByTable[activeTableId] ?? [] : [];
  const activeView = activeViews.find((v) => v.id === activeViewId) ?? null;

  const selectedRecord =
    activeRecords.find((record) => record.record_id === selectedRecordId) ?? null;
  const selectedRecordAttachments =
    activeTableId && selectedRecordId
      ? attachmentsByRecord[`${activeTableId}:${selectedRecordId}`] ?? []
      : [];
  const selectedRecordLinks =
    activeTableId && selectedRecordId ? linksByRecord[`${activeTableId}:${selectedRecordId}`] ?? [] : [];

  // Parse kanbanGroupByFieldId from active view config
  const kanbanGroupByFieldId = (() => {
    if (!activeView) return null;
    try {
      const cfg = JSON.parse(activeView.config_json) as { kanbanGroupByFieldId?: string };
      return cfg.kanbanGroupByFieldId ?? null;
    } catch {
      return null;
    }
  })();

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

  function handleSetKanbanGroupBy(fieldId: string) {
    if (!activeViewId) return;
    const { saveActiveViewConfig } = useWorkspaceStore.getState();
    // Merge into view config
    if (activeView) {
      try {
        const cfg = JSON.parse(activeView.config_json) as Record<string, unknown>;
        cfg["kanbanGroupByFieldId"] = fieldId;
        void saveActiveViewConfig(activeTableId!);
      } catch {
        // ignore
      }
    }
  }

  const viewType: ViewType = (activeView?.view_type ?? "grid") as ViewType;

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
        />
      );
    }

    if (viewType === "gallery") {
      return (
        <div className="gallery-view-wrap">
          <MainTableView
            table={activeTable}
            fields={activeFields}
            records={[]}
            fieldOptionsByField={fieldOptionsByField}
            sorts={activeSorts}
            filters={activeFilters}
            hiddenFieldIds={activeHiddenFieldIds}
            selectedRecordId={selectedRecordId}
            onSelectRecord={selectRecord}
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
          />
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
          <MainTableView
            table={activeTable}
            fields={activeFields}
            records={[]}
            fieldOptionsByField={fieldOptionsByField}
            sorts={activeSorts}
            filters={activeFilters}
            hiddenFieldIds={activeHiddenFieldIds}
            selectedRecordId={selectedRecordId}
            onSelectRecord={selectRecord}
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
          />
          <KanbanView
            fields={activeFields.filter((f) => !activeHiddenFieldIds.includes(f.id))}
            records={activeRecords}
            fieldOptionsByField={fieldOptionsByField}
            selectedRecordId={selectedRecordId}
            groupByFieldId={kanbanGroupByFieldId}
            onSelectRecord={selectRecord}
            onSetGroupByField={handleSetKanbanGroupBy}
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
        onSelectRecord={selectRecord}
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
        onSubmit={(name, type) => {
          if (activeTableId) {
            void createField(activeTableId, name, type);
          }
        }}
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
