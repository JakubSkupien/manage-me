import { Project } from "../models/Project";

const STORAGE_KEY = "manage-me-projects";

/**
 * ProjectStorageApi — abstracts all persistence logic.
 * Currently backed by localStorage.
 * To swap in a real API, replace the body of each method
 * (e.g. with fetch calls) while keeping the same signatures.
 */
export class ProjectStorageApi {
  // ---------- private helpers ----------

  private readAll(): Project[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Project[];
    } catch {
      return [];
    }
  }

  private writeAll(projects: Project[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }

  // ---------- public API ----------

  getAll(): Project[] {
    return this.readAll();
  }

  getById(id: string): Project | undefined {
    return this.readAll().find((p) => p.id === id);
  }

  create(projectData: Omit<Project, "id">): Project {
    const projects = this.readAll();
    const newProject: Project = {
      id: crypto.randomUUID(),
      ...projectData,
    };
    projects.push(newProject);
    this.writeAll(projects);
    return newProject;
  }

  update(id: string, projectData: Omit<Project, "id">): Project | null {
    const projects = this.readAll();
    const index = projects.findIndex((p) => p.id === id);
    if (index === -1) return null;
    const updated: Project = { id, ...projectData };
    projects[index] = updated;
    this.writeAll(projects);
    return updated;
  }

  delete(id: string): boolean {
    const projects = this.readAll();
    const filtered = projects.filter((p) => p.id !== id);
    if (filtered.length === projects.length) return false;
    this.writeAll(filtered);
    return true;
  }
}
