import { Priority } from "./Story";

export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  name: string;
  description: string;
  priority: Priority;
  storyId: string;
  estimatedHours: number;
  realizedHours: number;
  status: TaskStatus;
  createdAt: string;       // ISO 8601 — generowane automatycznie
  startedAt: string | null;  // ustawiane gdy status → doing
  finishedAt: string | null; // ustawiane gdy status → done
  assignedUserId: string | null;
}
