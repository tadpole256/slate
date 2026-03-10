import { useEffect, useMemo, useRef, useState } from "react";
import type { AppTable } from "../../types/slate";

interface CommandPaletteProps {
  open: boolean;
  tables: AppTable[];
  onClose: () => void;
  onSelectTable: (tableId: string) => void;
  onCreateTable: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  category: string;
  action: () => void;
}

export function CommandPalette({
  open,
  tables,
  onClose,
  onSelectTable,
  onCreateTable,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const allItems = useMemo<PaletteItem[]>(() => {
    const tableItems: PaletteItem[] = tables.map((t) => ({
      id: `table-${t.id}`,
      label: t.display_name,
      category: "Tables",
      action: () => { onSelectTable(t.id); onClose(); },
    }));

    const actionItems: PaletteItem[] = [
      {
        id: "action-new-table",
        label: "New Table",
        category: "Actions",
        action: () => { onCreateTable(); onClose(); },
      },
    ];

    return [...tableItems, ...actionItems];
  }, [tables, onSelectTable, onCreateTable, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter((item) => item.label.toLowerCase().includes(q));
  }, [allItems, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[activeIndex]?.action();
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!open) return null;

  // Group by category
  const categories = Array.from(new Set(filtered.map((i) => i.category)));
  let globalIndex = 0;

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="command-palette-input"
          placeholder="Search tables and actions…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="command-palette-list">
          {filtered.length === 0 ? (
            <div className="command-palette-empty">No results</div>
          ) : (
            categories.map((cat) => {
              const items = filtered.filter((i) => i.category === cat);
              return (
                <div key={cat} className="command-palette-group">
                  <div className="command-palette-category">{cat}</div>
                  {items.map((item) => {
                    const idx = globalIndex++;
                    return (
                      <div
                        key={item.id}
                        className={`command-palette-item${activeIndex === idx ? " active" : ""}`}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onClick={item.action}
                      >
                        {item.label}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
