export type Theme = "dark" | "light";

const STORAGE_KEY = "slate-theme";

/** Apply the saved (or default dark) theme to <html data-theme="..."> on every window load. */
export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
  document.documentElement.setAttribute("data-theme", saved ?? "dark");
}

/** Persist + immediately apply a theme choice. */
export function setTheme(t: Theme): void {
  localStorage.setItem(STORAGE_KEY, t);
  document.documentElement.setAttribute("data-theme", t);
}

/** Read the currently active theme (defaults to 'dark'). */
export function getTheme(): Theme {
  return (localStorage.getItem(STORAGE_KEY) as Theme) ?? "dark";
}
