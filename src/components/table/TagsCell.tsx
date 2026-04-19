import { useEffect, useRef, useState } from "react";

// ── Deterministic color from tag string ──────────────────────────────────────
// Each unique tag label maps consistently to one of these muted colors.
// No database storage needed — hash the label at render time.
const TAG_PALETTE = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
];

function tagColor(label: string): string {
  let h = 0;
  for (const c of label) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return TAG_PALETTE[h % TAG_PALETTE.length];
}

// ── CSV parse / serialize ────────────────────────────────────────────────────
// Same storage format as multi_select: comma-separated string.

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function serializeTags(tags: string[]): string | null {
  return tags.length > 0 ? tags.join(", ") : null;
}

// ── Component ────────────────────────────────────────────────────────────────

export interface TagsCellProps {
  value: string | null | undefined;
  readOnly?: boolean;
  onChange: (value: string | null) => void;
}

export function TagsCell({ value, readOnly = false, onChange }: TagsCellProps) {
  const [tags, setTags] = useState<string[]>(() => parseTags(value));
  const [inputVal, setInputVal] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync incoming prop → local state (after persist/refresh)
  useEffect(() => {
    setTags(parseTags(value));
  }, [value]);

  function addTag(raw: string) {
    const label = raw.trim().replace(/,+$/, "").trim();
    if (!label) return;
    setInputVal("");
    if (tags.includes(label)) return; // no duplicates
    const next = [...tags, label];
    setTags(next);
    onChange(serializeTags(next));
  }

  function removeTag(label: string) {
    const next = tags.filter((t) => t !== label);
    setTags(next);
    onChange(serializeTags(next));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && inputVal.trim()) {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === "Backspace" && inputVal === "" && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  function handleBlur() {
    if (inputVal.trim()) {
      addTag(inputVal);
    }
  }

  function handleContainerClick() {
    if (!readOnly) {
      inputRef.current?.focus();
    }
  }

  return (
    <div className="tags-cell" onClick={handleContainerClick}>
      {tags.map((tag) => (
        <span
          key={tag}
          className="tag-chip"
          style={{ background: tagColor(tag) }}
        >
          {tag}
          {!readOnly && (
            <button
              className="tag-chip-remove"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              aria-label={`Remove tag "${tag}"`}
              tabIndex={-1}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          ref={inputRef}
          className="tag-input"
          value={inputVal}
          placeholder={tags.length === 0 ? "Add tag…" : ""}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          aria-label="New tag"
        />
      )}
    </div>
  );
}
