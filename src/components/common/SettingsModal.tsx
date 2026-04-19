import { useState } from "react";
import { Database, FolderOpen, HardDrive, HardDriveDownload, Moon, RefreshCw, Sun, Unplug } from "lucide-react";
import type { BackupFile, ExternalConnection } from "../../types/slate";
import type { Theme } from "../../lib/theme";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  // Appearance
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  // Databases
  dbPath: string;
  externalConnections: ExternalConnection[];
  onConnectDb: () => void;
  onDisconnectExternal: (tableId: string) => void;
  // Backups
  backupDir: string | null;
  lastBackupAt: string | null;
  backupFiles: BackupFile[];
  backupsLoading: boolean;
  onPickFolder: () => Promise<void>;
  onRunBackup: () => Promise<string>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLastBackup(unixStr: string | null): string {
  if (!unixStr) return "Never";
  const secs = parseInt(unixStr, 10);
  if (isNaN(secs)) return "Unknown";
  return new Date(secs * 1000).toLocaleString();
}

function shortenPath(p: string, segments = 3): string {
  const parts = p.replace(/\\/g, "/").split("/").filter(Boolean);
  return parts.length > segments ? "…/" + parts.slice(-segments).join("/") : p;
}

export function SettingsModal({
  open,
  onClose,
  theme,
  onSetTheme,
  dbPath,
  externalConnections,
  onConnectDb,
  onDisconnectExternal,
  backupDir,
  lastBackupAt,
  backupFiles,
  backupsLoading,
  onPickFolder,
  onRunBackup,
}: SettingsModalProps) {
  const [backupStatus, setBackupStatus] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  if (!open) return null;

  async function handleRunBackup() {
    setRunning(true);
    setBackupStatus(null);
    setBackupError(null);
    try {
      const path = await onRunBackup();
      setBackupStatus(`✓ Saved: ${path.split("/").pop() ?? path}`);
    } catch (err) {
      setBackupError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  }

  const dirLabel = backupDir ? backupDir.split("/").slice(-2).join("/") : "Not configured";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Settings</h3>

        {/* ── Appearance ──────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
            <span>Appearance</span>
          </div>
          <div className="settings-row">
            <div className="settings-row-label">Theme</div>
            <div className="settings-row-value">
              <div className="theme-toggle">
                <button
                  className={`theme-toggle-btn${theme === "dark" ? " active" : ""}`}
                  onClick={() => onSetTheme("dark")}
                >
                  Dark
                </button>
                <button
                  className={`theme-toggle-btn${theme === "light" ? " active" : ""}`}
                  onClick={() => onSetTheme("light")}
                >
                  Light
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Databases ───────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <Database size={15} />
            <span>Databases</span>
          </div>

          {/* Internal DB */}
          <div className="settings-row" style={{ flexDirection: "column", alignItems: "flex-start", gap: "0.2rem" }}>
            <div className="settings-row-label">Internal database</div>
            {dbPath ? (
              <div className="settings-db-path" title={dbPath}>{shortenPath(dbPath, 4)}</div>
            ) : (
              <div className="settings-db-path" style={{ fontStyle: "italic" }}>Loading…</div>
            )}
          </div>

          {/* External connections */}
          <div className="settings-row-label" style={{ marginTop: "0.75rem", marginBottom: "0.4rem" }}>
            External connections
          </div>
          {externalConnections.length === 0 ? (
            <p className="settings-meta-text muted" style={{ marginBottom: "0.5rem" }}>
              No external databases connected.
            </p>
          ) : (
            <div className="settings-connection-list">
              {externalConnections.map((conn) => (
                <div key={conn.alias} className="settings-connection-item">
                  <div className="settings-connection-info">
                    <div className="settings-connection-name">{conn.alias}</div>
                    <div className="settings-connection-path" title={conn.file_path}>
                      {shortenPath(conn.file_path, 3)}
                    </div>
                    <div className="settings-connection-tables">
                      {conn.table_names.length} table{conn.table_names.length !== 1 ? "s" : ""}
                      {conn.table_names.length > 0 && ": " + conn.table_names.join(", ")}
                    </div>
                  </div>
                  <button
                    className="icon-button danger"
                    title="Disconnect external database"
                    onClick={() => onDisconnectExternal(conn.table_ids[0])}
                  >
                    <Unplug size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            className="ghost-button"
            style={{ marginTop: "0.5rem" }}
            onClick={() => { onConnectDb(); onClose(); }}
          >
            <HardDriveDownload size={14} />
            Connect Database…
          </button>
        </div>

        {/* ── Backups ─────────────────────────────────────────── */}
        <div className="settings-section">
          <div className="settings-section-header">
            <HardDrive size={15} />
            <span>Backups</span>
          </div>

          <div className="settings-row">
            <div className="settings-row-label">Backup folder</div>
            <div className="settings-row-value">
              <span className={`settings-folder-path ${backupDir ? "" : "muted"}`} title={backupDir ?? undefined}>
                {dirLabel}
              </span>
              <button className="action-button secondary small-button" onClick={onPickFolder}>
                <FolderOpen size={13} />
                Choose
              </button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-row-label">Last backup</div>
            <div className="settings-row-value">
              <span className="settings-meta-text">{formatLastBackup(lastBackupAt)}</span>
              <button
                className="action-button small-button"
                disabled={!backupDir || running || backupsLoading}
                onClick={() => void handleRunBackup()}
              >
                <RefreshCw size={13} className={running ? "spin" : ""} />
                {running ? "Backing up…" : "Backup Now"}
              </button>
            </div>
          </div>

          {backupStatus && <p className="settings-status-ok">{backupStatus}</p>}
          {backupError && <p className="settings-status-error">{backupError}</p>}

          {backupFiles.length > 0 && (
            <div className="settings-backup-list">
              <div className="settings-backup-list-header">Recent backups</div>
              {backupFiles.map((f) => (
                <div key={f.path} className="settings-backup-item">
                  <span className="settings-backup-name">{f.name}</span>
                  <span className="settings-backup-size">{formatBytes(f.size_bytes)}</span>
                </div>
              ))}
            </div>
          )}

          {backupDir && backupFiles.length === 0 && !backupsLoading && (
            <p className="settings-meta-text muted" style={{ marginTop: "0.5rem" }}>
              No backups found in this folder yet.
            </p>
          )}
        </div>

        <div className="modal-actions" style={{ marginTop: "0.5rem" }}>
          <button className="action-button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
