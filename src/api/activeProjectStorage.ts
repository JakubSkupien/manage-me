const ACTIVE_PROJECT_KEY = "manage-me-active-project";

/**
 * Persists the currently selected project ID in localStorage.
 * Swap the implementation here to store it server-side in the future.
 */
export class ActiveProjectStorage {
  get(): string | null {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  }

  set(projectId: string): void {
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  }

  clear(): void {
    localStorage.removeItem(ACTIVE_PROJECT_KEY);
  }
}
