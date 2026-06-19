import { Task } from "../models/Task";
import { Priority } from "../models/Story";

const STORAGE_KEY = "manage-me-tasks";

/**
 * TaskStorageApi — abstracts all task persistence logic.
 * Currently backed by localStorage.
 * To swap in a real API, replace method bodies with fetch calls
 * while keeping the same public signatures.
 */
export class TaskStorageApi {
  // ---------- private helpers ----------

  private readAll(): Task[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Task[];
    } catch {
      return [];
    }
  }

  private writeAll(tasks: Task[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  // ---------- public API ----------

  getAll(): Task[] {
    return this.readAll();
  }

  getByStory(storyId: string): Task[] {
    return this.readAll().filter((t) => t.storyId === storyId);
  }

  getByStories(storyIds: string[]): Task[] {
    return this.readAll().filter((t) => storyIds.includes(t.storyId));
  }

  getById(id: string): Task | undefined {
    return this.readAll().find((t) => t.id === id);
  }

  /**
   * Creates a new task with default values.
   * Status always starts as "todo".
   * assignedUserId, startedAt, finishedAt start as null.
   * realizedHours starts as 0.
   */
  create(data: {
    name: string;
    description: string;
    priority: Priority;
    storyId: string;
    estimatedHours: number;
  }): Task {
    const tasks = this.readAll();
    const newTask: Task = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      assignedUserId: null,
      realizedHours: 0,
      status: "todo",
      ...data,
    };
    tasks.push(newTask);
    this.writeAll(tasks);
    return newTask;
  }

  /**
   * Partial update — only provided fields are changed.
   * id and createdAt are always preserved from the original.
   */
  update(id: string, data: Partial<Omit<Task, "id" | "createdAt">>): Task | null {
    const tasks = this.readAll();
    const index = tasks.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const updated: Task = { ...tasks[index], ...data };
    tasks[index] = updated;
    this.writeAll(tasks);
    return updated;
  }

  delete(id: string): boolean {
    const tasks = this.readAll();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length === tasks.length) return false;
    this.writeAll(filtered);
    return true;
  }

  /** Remove all tasks belonging to one story (called when a story is deleted). */
  deleteByStory(storyId: string): void {
    this.writeAll(this.readAll().filter((t) => t.storyId !== storyId));
  }

  /** Remove all tasks belonging to any of the given story IDs (called when a project is deleted). */
  deleteByStories(storyIds: string[]): void {
    this.writeAll(this.readAll().filter((t) => !storyIds.includes(t.storyId)));
  }
}
