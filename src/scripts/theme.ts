export const THEMES = ["dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(value: unknown): value is Theme {
  return THEMES.some((theme) => theme === value);
}

export const themeStorageKey = "theme";

/**
 * Applies a stored theme before first paint. Inlined into <head> as a string,
 * so it must not reference anything outside its own body, which is why it
 * spells out the theme names instead of calling isTheme.
 */
export function initTheme(storageKey: string): void {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === "dark" || stored === "light") {
      document.documentElement.dataset.theme = stored;
    }
  } catch {
    // Storage can be blocked; the page then follows the system theme
  }
}

function currentTheme(): Theme {
  const { theme } = document.documentElement.dataset;
  if (isTheme(theme)) {
    return theme;
  }
  return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function toggleTheme(): Theme {
  const theme: Theme = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // The choice then lasts only for this page
  }
  return theme;
}
