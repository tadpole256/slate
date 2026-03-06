import { useEffect } from "react";
import { AddColumnModal } from "./components/common/AddColumnModal";
import { CreateTableModal } from "./components/common/CreateTableModal";
import { AppLayout } from "./components/layout/AppLayout";
import { Sidebar } from "./components/layout/Sidebar";
import { TopBar } from "./components/layout/TopBar";
import { RecordDetailPanel } from "./components/record/RecordDetailPanel";
import { MainTableView } from "./components/table/MainTableView";
import { useWorkspaceStore } from "./store/workspaceStore";

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
    initialize,
    forceStartupFailure,
    setActiveTable,
    refreshActiveTable,
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
    loadRecordLinks,
    createRecordLink,
    deleteRecordLink,
    loadRecordOptions,
    loadRecordAttachments,
    attachFileToRecord,
    deleteAttachment,
    openAttachment
  } = useWorkspaceStore();

  const activeTable = tables.find((table) => table.id === activeTableId) ?? null;
  const activeFields = activeTableId ? fieldsByTable[activeTableId] ?? [] : [];
  const activeRecords = activeTableId ? recordsByTable[activeTableId] ?? [] : [];
  const selectedRecord =
    activeRecords.find((record) => record.record_id === selectedRecordId) ?? null;
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
    void initialize();
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

  useEffect(() => {
    if (!activeTableId) {
      return;
    }

    const timer = setTimeout(() => {
      void refreshActiveTable();
    }, 160);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTableId, refreshActiveTable]);

  useEffect(() => {
    if (!activeTableId || !selectedRecordId) {
      return;
    }

    void loadRecordAttachments(activeTableId, selectedRecordId);
  }, [activeTableId, selectedRecordId, loadRecordAttachments]);

  useEffect(() => {
    if (!activeTableId || !selectedRecordId) {
      return;
    }

    void loadRecordLinks(activeTableId, selectedRecordId);
  }, [activeTableId, selectedRecordId, loadRecordLinks]);

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
              if (window.confirm(`Delete table \"${currentName}\" and all records?`)) {
                void deleteTable(tableId);
              }
            }}
          />
        }
        main={
          <MainTableView
            table={activeTable}
            fields={activeFields}
            records={activeRecords}
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
              if (window.confirm(`Delete column \"${field.display_name}\"?`)) {
                void deleteField(field.id);
              }
            }}
          />
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
            onOpenAttachment={(attachmentId) => {
              void openAttachment(attachmentId);
            }}
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
            onLoadRecordOptions={(tableId, query) => {
              void loadRecordOptions(tableId, query);
            }}
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

      {loading && !error ? (
        <div className="loading-overlay" style={{flexDirection: "column", padding: '1rem'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <div className="loading-spinner" aria-hidden="true" />
            <span>Loading Slate...</span>
          </div>
          <pre style={{fontSize: '10px', color: '#ff0'}}>
            {JSON.stringify({
              time: new Date().toISOString(),
              tablesLen: tables.length,
              loading,
              error
            }, null, 2)}
          </pre>
        </div>
      ) : null}
      {error ? <div className="error-banner">{error}</div> : null}
    </>
  );
}
