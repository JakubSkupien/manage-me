import { Story, Status } from "../models/Story";

const STORAGE_KEY = "manage-me-stories";

/**
 * StoryStorageApi — abstracts all story persistence logic.
 * Currently backed by localStorage.
 * To swap in a real API, replace method bodies with fetch calls
 * while keeping the same public signatures.
 */
export class StoryStorageApi {
  // ---------- private helpers ----------

  private readAll(): Story[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Story[];
    } catch {
      return [];
    }
  }

  private writeAll(stories: Story[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
  }

  // ---------- public API ----------

  getAll(): Story[] {
    return this.readAll();
  }

  getByProject(projectId: string): Story[] {
    return this.readAll().filter((s) => s.projectId === projectId);
  }

  getById(id: string): Story | undefined {
    return this.readAll().find((s) => s.id === id);
  }

  create(data: Omit<Story, "id" | "createdAt">): Story {
    const stories = this.readAll();
    const newStory: Story = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...data,
    };
    stories.push(newStory);
    this.writeAll(stories);
    return newStory;
  }

  /** Full update — all mutable fields replaced. createdAt is always preserved. */
  update(id: string, data: Omit<Story, "id" | "createdAt">): Story | null {
    const stories = this.readAll();
    const index = stories.findIndex((s) => s.id === id);
    if (index === -1) return null;
    const updated: Story = { id, createdAt: stories[index].createdAt, ...data };
    stories[index] = updated;
    this.writeAll(stories);
    return updated;
  }

  /** Targeted status-only update used by task business logic. */
  updateStatus(id: string, status: Status): Story | null {
    const stories = this.readAll();
    const index = stories.findIndex((s) => s.id === id);
    if (index === -1) return null;
    stories[index] = { ...stories[index], status };
    this.writeAll(stories);
    return stories[index];
  }

  delete(id: string): boolean {
    const stories = this.readAll();
    const filtered = stories.filter((s) => s.id !== id);
    if (filtered.length === stories.length) return false;
    this.writeAll(filtered);
    return true;
  }

  /** Remove all stories belonging to a project (called on project delete). */
  deleteByProject(projectId: string): void {
    this.writeAll(this.readAll().filter((s) => s.projectId !== projectId));
  }
}
