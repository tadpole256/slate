import { Plus, Settings } from "lucide-react";
import { SearchInput } from "../common/SearchInput";

interface TopBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddRecord: () => void;
  onAddTable: () => void;
  onOpenSettings: () => void;
  disableAddRecord?: boolean;
}

export function TopBar({
  searchQuery,
  onSearchChange,
  onAddRecord,
  onAddTable,
  onOpenSettings,
  disableAddRecord
}: TopBarProps) {
  return (
    <div className="top-bar-content">
      <div className="brand-block">
        <div className="brand-dot">S</div>
        <div>
          <div className="brand-title">Slate</div>
          <div className="brand-subtitle">Local workspace</div>
        </div>
      </div>

      <SearchInput value={searchQuery} onChange={onSearchChange} />

      <div className="top-bar-actions">
        <button className="action-button" onClick={onAddRecord} disabled={disableAddRecord}>
          <Plus size={16} />
          Record
        </button>
        <button className="action-button secondary" onClick={onAddTable}>
          <Plus size={16} />
          Table
        </button>
        <button className="icon-button" onClick={onOpenSettings} title="Settings">
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}
