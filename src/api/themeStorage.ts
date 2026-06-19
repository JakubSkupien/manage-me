export type ThemeMode = "light" | "dark";

const THEME_KEY = "manage-me-theme";

/**
 * ThemeStorageApi — manages light/dark theme preference.
 * Persists the choice in localStorage under "manage-me-theme".
 * Falls back to prefers-color-scheme when no preference is saved.
 * Applies theme via data-bs-theme attribute on <html> (Bootstrap 5.3 convention).
 */
export class ThemeStorageApi {
  getTheme(): ThemeMode {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
    // Fall back to OS/browser preference
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  setTheme(theme: ThemeMode): void {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-bs-theme", theme);
  }

  toggleTheme(): ThemeMode {
    const next: ThemeMode = this.getTheme() === "light" ? "dark" : "light";
    this.setTheme(next);
    return next;
  }

  /** Call once on app start — reads saved/preferred theme and applies it. */
  applySavedTheme(): void {
    document.documentElement.setAttribute("data-bs-theme", this.getTheme());
  }
}
