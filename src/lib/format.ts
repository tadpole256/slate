export function titleToInitials(value: string): string {
  const parts = value.trim().split(/\s+/);
  if (!parts.length) {
    return "S";
  }
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function normalizeName(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function readableFieldType(type: string): string {
  switch (type) {
    case "long_text":
      return "Long text";
    case "checkbox":
      return "Checkbox";
    case "date":
      return "Date";
    case "link":
      return "Link";
    default:
      return "Text";
  }
}
