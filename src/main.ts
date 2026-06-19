import "./style.css";
import { ProjectStorageApi } from "./api/projectStorage";
import { StoryStorageApi } from "./api/storyStorage";
import { ActiveProjectStorage } from "./api/activeProjectStorage";
import { TaskStorageApi } from "./api/taskStorage";
import { currentUser, users } from "./mocks/currentUser";
import { Priority, Status } from "./models/Story";
import { Task, TaskStatus } from "./models/Task";
import { User, Role } from "./models/User";

// ─── API instances ────────────────────────────────────────────────────────────

const projectApi = new ProjectStorageApi();
const storyApi = new StoryStorageApi();
const activeProjectStorage = new ActiveProjectStorage();
const taskApi = new TaskStorageApi();

// ─── Security ─────────────────────────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

function getUserById(id: string): User | undefined {
  return users.find((u: User) => u.id === id);
}

function getUserName(id: string | null): string {
  if (!id) return "Brak przypisania";
  const u = getUserById(id);
  return u ? `${u.firstName} ${u.lastName}` : "Nieznany użytkownik";
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Niski",
  medium: "Średni",
  high: "Wysoki",
};

const STATUS_LABELS: Record<Status, string> = {
  todo: "Do zrobienia",
  doing: "W trakcie",
  done: "Gotowe",
};

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  developer: "Developer",
  devops: "DevOps",
};

// ─── DOM references ───────────────────────────────────────────────────────────

// User
const userNameEl = document.getElementById("user-name") as HTMLSpanElement;
const userRoleEl = document.getElementById("user-role") as HTMLSpanElement;

// Project form
const projectForm = document.getElementById("project-form") as HTMLFormElement;
const projectNameInput = document.getElementById("project-name") as HTMLInputElement;
const projectDescInput = document.getElementById("project-desc") as HTMLTextAreaElement;
const projectSubmitBtn = document.getElementById("project-submit-btn") as HTMLButtonElement;
const projectCancelBtn = document.getElementById("project-cancel-btn") as HTMLButtonElement;
const projectFormTitle = document.getElementById("project-form-title") as HTMLHeadingElement;
const projectList = document.getElementById("project-list") as HTMLUListElement;
const projectEmptyMsg = document.getElementById("project-empty-message") as HTMLParagraphElement;

// Active project info
const activeProjectSection = document.getElementById("active-project-section") as HTMLElement;
const activeProjectName = document.getElementById("active-project-name") as HTMLHeadingElement;
const activeProjectDesc = document.getElementById("active-project-desc") as HTMLParagraphElement;

// Tabs
const tabBtns = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
const tabStories = document.getElementById("tab-stories") as HTMLElement;
const tabKanban = document.getElementById("tab-kanban") as HTMLElement;

// Story form
const storyForm = document.getElementById("story-form") as HTMLFormElement;
const storyNameInput = document.getElementById("story-name") as HTMLInputElement;
const storyDescInput = document.getElementById("story-desc") as HTMLTextAreaElement;
const storyPrioritySelect = document.getElementById("story-priority") as HTMLSelectElement;
const storyStatusSelect = document.getElementById("story-status") as HTMLSelectElement;
const storySubmitBtn = document.getElementById("story-submit-btn") as HTMLButtonElement;
const storyCancelBtn = document.getElementById("story-cancel-btn") as HTMLButtonElement;
const storyFormTitle = document.getElementById("story-form-title") as HTMLHeadingElement;

// Story list & filters
const storyList = document.getElementById("story-list") as HTMLUListElement;
const storyEmptyMsg = document.getElementById("story-empty-message") as HTMLParagraphElement;
const filterBtns = document.querySelectorAll<HTMLButtonElement>(".filter-btn");

// Kanban columns
const kanbanTodo = document.getElementById("kanban-todo") as HTMLUListElement;
const kanbanDoing = document.getElementById("kanban-doing") as HTMLUListElement;
const kanbanDone = document.getElementById("kanban-done") as HTMLUListElement;

// Task modal
const taskModalOverlay = document.getElementById("task-modal-overlay") as HTMLElement;
const modalCloseBtn = document.getElementById("modal-close-btn") as HTMLButtonElement;
const modalTaskName = document.getElementById("modal-task-name") as HTMLHeadingElement;
const modalEditName = document.getElementById("modal-edit-name") as HTMLInputElement;
const modalEditDesc = document.getElementById("modal-edit-desc") as HTMLTextAreaElement;
const modalEditPriority = document.getElementById("modal-edit-priority") as HTMLSelectElement;
const modalEditEstimated = document.getElementById("modal-edit-estimated") as HTMLInputElement;
const modalSaveBtn = document.getElementById("modal-save-btn") as HTMLButtonElement;
const modalTaskDetails = document.getElementById("modal-task-details") as HTMLElement;
const modalAssignSection = document.getElementById("modal-assign-section") as HTMLElement;
const modalUserSelect = document.getElementById("modal-user-select") as HTMLSelectElement;
const modalAssignBtn = document.getElementById("modal-assign-btn") as HTMLButtonElement;
const modalDoneSection = document.getElementById("modal-done-section") as HTMLElement;
const modalRealizedHours = document.getElementById("modal-realized-hours") as HTMLInputElement;
const modalDoneBtn = document.getElementById("modal-done-btn") as HTMLButtonElement;

// ─── State ────────────────────────────────────────────────────────────────────

let editingProjectId: string | null = null;
let editingStoryId: string | null = null;
let activeStoryFilter: "all" | Status = "all";
let activeTab: "stories" | "kanban" = "stories";
const expandedStoryIds = new Set<string>();
let addingTaskForStoryId: string | null = null;
let detailTaskId: string | null = null;

// ─── Render: user ─────────────────────────────────────────────────────────────

function renderUser(): void {
  userNameEl.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
  userRoleEl.textContent = ROLE_LABELS[currentUser.role];
  userRoleEl.className = `badge badge--role badge--role-${currentUser.role}`;
}

// ─── Render: projects ─────────────────────────────────────────────────────────

function renderProjects(): void {
  const projects = projectApi.getAll();
  const activeId = activeProjectStorage.get();
  projectList.innerHTML = "";

  if (projects.length === 0) {
    projectEmptyMsg.style.display = "block";
    return;
  }
  projectEmptyMsg.style.display = "none";

  projects.forEach((project) => {
    const isActive = project.id === activeId;
    const li = document.createElement("li");
    li.className = `project-item${isActive ? " project-item--active" : ""}`;
    li.innerHTML = `
      <div class="project-info">
        <h3 class="project-name">
          ${escapeHtml(project.name)}
          ${isActive ? '<span class="badge badge--active">Aktywny</span>' : ""}
        </h3>
        <p class="project-desc">${escapeHtml(project.description)}</p>
      </div>
      <div class="project-actions">
        ${!isActive ? `<button class="btn btn-activate" data-id="${project.id}">Ustaw aktywny</button>` : ""}
        <button class="btn btn-edit" data-id="${project.id}">Edytuj</button>
        <button class="btn btn-delete" data-id="${project.id}">Usuń</button>
      </div>
    `;
    projectList.appendChild(li);
  });

  projectList.querySelectorAll<HTMLButtonElement>(".btn-activate").forEach((btn) =>
    btn.addEventListener("click", () => setActiveProject(btn.dataset.id!))
  );
  projectList.querySelectorAll<HTMLButtonElement>(".btn-edit").forEach((btn) =>
    btn.addEventListener("click", () => startEditProject(btn.dataset.id!))
  );
  projectList.querySelectorAll<HTMLButtonElement>(".btn-delete").forEach((btn) =>
    btn.addEventListener("click", () => handleDeleteProject(btn.dataset.id!))
  );
}

// ─── Render: active project panel ─────────────────────────────────────────────

function renderActiveProject(): void {
  const activeId = activeProjectStorage.get();
  if (!activeId) {
    activeProjectSection.style.display = "none";
    return;
  }
  const project = projectApi.getById(activeId);
  if (!project) {
    activeProjectStorage.clear();
    activeProjectSection.style.display = "none";
    return;
  }
  activeProjectSection.style.display = "block";
  activeProjectName.textContent = project.name;
  activeProjectDesc.textContent = project.description;

  renderStories();
  if (activeTab === "kanban") renderKanban();
}

// ─── Render: task section HTML (helper, returns string) ───────────────────────

function renderTasksHtml(storyId: string, tasks: Task[]): string {
  const isAddingTask = addingTaskForStoryId === storyId;

  const taskItems = tasks.length > 0
    ? tasks.map((task: Task) => `
        <li class="task-card">
          <div class="task-card__header">
            <span class="task-card__name">${escapeHtml(task.name)}</span>
            <div class="task-card__badges">
              <span class="badge badge--priority badge--${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
              <span class="badge badge--status badge--${task.status}">${STATUS_LABELS[task.status as Status]}</span>
            </div>
          </div>
          ${task.assignedUserId
            ? `<div class="task-card__assigned">👤 ${escapeHtml(getUserName(task.assignedUserId))}</div>`
            : ""}
          <div class="task-card__actions">
            <button class="btn btn-sm btn-task-details" data-task-id="${task.id}">Szczegóły</button>
            <button class="btn btn-sm btn-delete btn-task-delete" data-task-id="${task.id}">Usuń</button>
          </div>
        </li>
      `).join("")
    : '<li class="task-empty">Brak zadań w tej historyjce.</li>';

  const taskFormHtml = isAddingTask
    ? `<form class="task-inline-form" data-story-id="${storyId}" novalidate>
        <div class="form-group">
          <label>Nazwa zadania</label>
          <input type="text" name="name" placeholder="Wpisz nazwę zadania" autocomplete="off" />
        </div>
        <div class="form-group">
          <label>Opis</label>
          <textarea name="description" placeholder="Wpisz opis zadania"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Priorytet</label>
            <select name="priority">
              <option value="low">Niski</option>
              <option value="medium" selected>Średni</option>
              <option value="high">Wysoki</option>
            </select>
          </div>
          <div class="form-group">
            <label>Szacowane godziny</label>
            <input type="number" name="estimatedHours" min="0" step="0.5" value="1" />
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-sm btn-primary">Dodaj zadanie</button>
          <button type="button" class="btn btn-sm btn-secondary btn-cancel-task">Anuluj</button>
        </div>
      </form>`
    : `<button class="btn btn-sm btn-add-task" data-story-id="${storyId}">＋ Dodaj zadanie</button>`;

  return `<div class="task-section">
    <ul class="task-list">${taskItems}</ul>
    <div class="task-add-area">${taskFormHtml}</div>
  </div>`;
}

// ─── Render: stories ──────────────────────────────────────────────────────────

function renderStories(): void {
  const activeId = activeProjectStorage.get();
  if (!activeId) return;

  let stories = storyApi.getByProject(activeId);
  if (activeStoryFilter !== "all") {
    stories = stories.filter((s) => s.status === activeStoryFilter);
  }

  storyList.innerHTML = "";

  if (stories.length === 0) {
    storyEmptyMsg.style.display = "block";
    return;
  }
  storyEmptyMsg.style.display = "none";

  stories.forEach((story) => {
    const tasks = taskApi.getByStory(story.id);
    const isExpanded = expandedStoryIds.has(story.id);

    const li = document.createElement("li");
    li.className = "story-item";
    li.innerHTML = `
      <div class="story-header">
        <h4 class="story-name">${escapeHtml(story.name)}</h4>
        <div class="story-badges">
          <span class="badge badge--priority badge--${story.priority}">${PRIORITY_LABELS[story.priority]}</span>
          <span class="badge badge--status badge--${story.status}">${STATUS_LABELS[story.status]}</span>
        </div>
      </div>
      <p class="story-desc">${escapeHtml(story.description)}</p>
      <div class="story-footer">
        <small>Utworzono: ${formatDate(story.createdAt)}</small>
        <small>Właściciel: ${escapeHtml(getUserName(story.ownerId))}</small>
      </div>
      <div class="project-actions story-actions">
        <button class="btn btn-tasks btn-toggle-tasks" data-story-id="${story.id}">
          Zadania (${tasks.length}) ${isExpanded ? "▲" : "▼"}
        </button>
        <button class="btn btn-edit" data-id="${story.id}">Edytuj</button>
        <button class="btn btn-delete" data-id="${story.id}">Usuń</button>
      </div>
      ${isExpanded ? renderTasksHtml(story.id, tasks) : ""}
    `;
    storyList.appendChild(li);
  });

  // Story event listeners
  storyList.querySelectorAll<HTMLButtonElement>(".btn-toggle-tasks").forEach((btn) =>
    btn.addEventListener("click", () => toggleStoryTasks(btn.dataset.storyId!))
  );
  storyList.querySelectorAll<HTMLButtonElement>(".btn-edit").forEach((btn) =>
    btn.addEventListener("click", () => startEditStory(btn.dataset.id!))
  );
  storyList.querySelectorAll<HTMLButtonElement>(".btn-delete").forEach((btn) =>
    btn.addEventListener("click", () => handleDeleteStory(btn.dataset.id!))
  );

  // Task event listeners
  storyList.querySelectorAll<HTMLButtonElement>(".btn-task-details").forEach((btn) =>
    btn.addEventListener("click", () => openTaskModal(btn.dataset.taskId!))
  );
  storyList.querySelectorAll<HTMLButtonElement>(".btn-task-delete").forEach((btn) =>
    btn.addEventListener("click", () => handleDeleteTask(btn.dataset.taskId!))
  );
  storyList.querySelectorAll<HTMLButtonElement>(".btn-add-task").forEach((btn) =>
    btn.addEventListener("click", () => {
      addingTaskForStoryId = btn.dataset.storyId!;
      expandedStoryIds.add(btn.dataset.storyId!);
      renderStories();
    })
  );
  storyList.querySelectorAll<HTMLButtonElement>(".btn-cancel-task").forEach((btn) =>
    btn.addEventListener("click", () => {
      addingTaskForStoryId = null;
      renderStories();
    })
  );
  storyList.querySelectorAll<HTMLFormElement>(".task-inline-form").forEach((form) =>
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      handleAddTask(form);
    })
  );
}

// ─── Render: kanban ───────────────────────────────────────────────────────────

function renderKanban(): void {
  const activeId = activeProjectStorage.get();
  if (!activeId) return;

  const stories = storyApi.getByProject(activeId);
  const storyIds = stories.map((s) => s.id);
  const storyMap = new Map(stories.map((s) => [s.id, s]));
  const allTasks = taskApi.getByStories(storyIds);

  const fillColumn = (list: HTMLUListElement, status: TaskStatus) => {
    const group = allTasks.filter((t: Task) => t.status === status);
    list.innerHTML = "";
    if (group.length === 0) {
      list.innerHTML = '<li class="kanban-empty">Brak zadań</li>';
      return;
    }
    group.forEach((task: Task) => {
      const story = storyMap.get(task.storyId);
      const assignee = task.assignedUserId ? getUserById(task.assignedUserId) : null;
      const li = document.createElement("li");
      li.className = "kanban-card";
      li.innerHTML = `
        <div class="kanban-card__header">
          <span class="kanban-card__name">${escapeHtml(task.name)}</span>
          <span class="badge badge--priority badge--${task.priority}">${PRIORITY_LABELS[task.priority]}</span>
        </div>
        <div class="kanban-card__story">📋 ${escapeHtml(story?.name ?? "—")}</div>
        ${assignee
          ? `<div class="kanban-card__user">👤 ${escapeHtml(assignee.firstName)} ${escapeHtml(assignee.lastName)}</div>`
          : ""}
        <div class="kanban-card__footer">
          <button class="btn btn-sm btn-task-details" data-task-id="${task.id}">Szczegóły</button>
        </div>
      `;
      list.appendChild(li);
    });

    list.querySelectorAll<HTMLButtonElement>(".btn-task-details").forEach((btn) =>
      btn.addEventListener("click", () => openTaskModal(btn.dataset.taskId!))
    );
  };

  fillColumn(kanbanTodo, "todo");
  fillColumn(kanbanDoing, "doing");
  fillColumn(kanbanDone, "done");
}

// ─── Render: task modal ───────────────────────────────────────────────────────

function openTaskModal(taskId: string): void {
  detailTaskId = taskId;
  renderTaskModal();
  taskModalOverlay.style.display = "flex";
}

function closeTaskModal(): void {
  detailTaskId = null;
  taskModalOverlay.style.display = "none";
}

function renderTaskModal(): void {
  if (!detailTaskId) return;
  const task = taskApi.getById(detailTaskId);
  if (!task) { closeTaskModal(); return; }

  const story = storyApi.getById(task.storyId);
  const assignee = task.assignedUserId ? getUserById(task.assignedUserId) : null;

  // Header & editable fields
  modalTaskName.textContent = escapeHtml(task.name);
  modalEditName.value = task.name;
  modalEditDesc.value = task.description;
  modalEditPriority.value = task.priority;
  modalEditEstimated.value = String(task.estimatedHours);

  // Read-only details
  modalTaskDetails.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Status</span>
      <span class="detail-value">
        <span class="badge badge--status badge--${task.status}">${STATUS_LABELS[task.status as Status]}</span>
      </span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Historyjka</span>
      <span class="detail-value">${escapeHtml(story?.name ?? "(brak)")}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Data dodania</span>
      <span class="detail-value">${formatDate(task.createdAt)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Data startu</span>
      <span class="detail-value">${formatDate(task.startedAt)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Data zakończenia</span>
      <span class="detail-value">${formatDate(task.finishedAt)}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Szacowane godziny</span>
      <span class="detail-value">${task.estimatedHours} h</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Zrealizowane godziny</span>
      <span class="detail-value">${task.realizedHours} h</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Przypisana osoba</span>
      <span class="detail-value">${
        assignee
          ? `${escapeHtml(assignee.firstName)} ${escapeHtml(assignee.lastName)} (${ROLE_LABELS[assignee.role]})`
          : "Brak przypisania"
      }</span>
    </div>
  `;

  // Assign section: visible when not yet done
  if (task.status !== "done") {
    modalAssignSection.style.display = "block";
    const assignable = users.filter((u: User) => u.role === "developer" || u.role === "devops");
    modalUserSelect.innerHTML =
      '<option value="">-- Wybierz osobę --</option>' +
      assignable
        .map(
          (u: User) =>
            `<option value="${u.id}" ${task.assignedUserId === u.id ? "selected" : ""}>
              ${escapeHtml(u.firstName)} ${escapeHtml(u.lastName)} (${ROLE_LABELS[u.role]})
            </option>`
        )
        .join("");
  } else {
    modalAssignSection.style.display = "none";
  }

  // Done section: visible when doing
  if (task.status === "doing") {
    modalDoneSection.style.display = "block";
    modalRealizedHours.value = String(task.realizedHours);
  } else {
    modalDoneSection.style.display = "none";
  }
}

// ─── Project form helpers ─────────────────────────────────────────────────────

function resetProjectForm(): void {
  projectForm.reset();
  editingProjectId = null;
  projectFormTitle.textContent = "Dodaj projekt";
  projectSubmitBtn.textContent = "Dodaj";
  projectCancelBtn.style.display = "none";
}

function startEditProject(id: string): void {
  const project = projectApi.getById(id);
  if (!project) return;
  editingProjectId = id;
  projectNameInput.value = project.name;
  projectDescInput.value = project.description;
  projectFormTitle.textContent = "Edytuj projekt";
  projectSubmitBtn.textContent = "Zapisz";
  projectCancelBtn.style.display = "inline-block";
  projectNameInput.focus();
}

// ─── Project handlers ─────────────────────────────────────────────────────────

function handleProjectSubmit(e: Event): void {
  e.preventDefault();
  const name = projectNameInput.value.trim();
  const description = projectDescInput.value.trim();
  if (!name || !description) { alert("Nazwa i opis projektu nie mogą być puste."); return; }
  if (editingProjectId) {
    projectApi.update(editingProjectId, { name, description });
  } else {
    projectApi.create({ name, description });
  }
  resetProjectForm();
  renderProjects();
  renderActiveProject();
}

function setActiveProject(id: string): void {
  activeProjectStorage.set(id);
  activeStoryFilter = "all";
  activeTab = "stories";
  expandedStoryIds.clear();
  addingTaskForStoryId = null;
  updateFilterButtons();
  switchTab("stories");
  renderProjects();
  renderActiveProject();
}

function handleDeleteProject(id: string): void {
  if (!confirm("Czy na pewno chcesz usunąć ten projekt? Usunięte zostaną też jego historyjki i zadania.")) return;

  // Cascade: tasks → stories → project
  const stories = storyApi.getByProject(id);
  taskApi.deleteByStories(stories.map((s) => s.id));
  storyApi.deleteByProject(id);

  if (activeProjectStorage.get() === id) activeProjectStorage.clear();
  projectApi.delete(id);

  renderProjects();
  renderActiveProject();
}

// ─── Story form helpers ───────────────────────────────────────────────────────

function resetStoryForm(): void {
  storyForm.reset();
  editingStoryId = null;
  storyFormTitle.textContent = "Dodaj historyjkę";
  storySubmitBtn.textContent = "Dodaj";
  storyCancelBtn.style.display = "none";
}

function startEditStory(id: string): void {
  const story = storyApi.getById(id);
  if (!story) return;
  editingStoryId = id;
  storyNameInput.value = story.name;
  storyDescInput.value = story.description;
  storyPrioritySelect.value = story.priority;
  storyStatusSelect.value = story.status;
  storyFormTitle.textContent = "Edytuj historyjkę";
  storySubmitBtn.textContent = "Zapisz";
  storyCancelBtn.style.display = "inline-block";
  storyNameInput.focus();
}

// ─── Story handlers ───────────────────────────────────────────────────────────

function handleStorySubmit(e: Event): void {
  e.preventDefault();
  const name = storyNameInput.value.trim();
  const description = storyDescInput.value.trim();
  const priority = storyPrioritySelect.value as Priority;
  const status = storyStatusSelect.value as Status;
  const activeId = activeProjectStorage.get();
  if (!activeId) return;
  if (!name || !description) { alert("Nazwa i opis historyjki nie mogą być puste."); return; }

  if (editingStoryId) {
    const existing = storyApi.getById(editingStoryId);
    if (!existing) return;
    storyApi.update(editingStoryId, {
      name, description, priority, status,
      projectId: existing.projectId,
      ownerId: existing.ownerId,
    });
  } else {
    storyApi.create({ name, description, priority, status, projectId: activeId, ownerId: currentUser.id });
  }

  resetStoryForm();
  renderStories();
}

function handleDeleteStory(id: string): void {
  if (!confirm("Czy na pewno chcesz usunąć tę historyjkę? Usunięte zostaną też jej zadania.")) return;
  taskApi.deleteByStory(id);
  storyApi.delete(id);
  expandedStoryIds.delete(id);
  if (addingTaskForStoryId === id) addingTaskForStoryId = null;
  renderStories();
  if (activeTab === "kanban") renderKanban();
}

function toggleStoryTasks(storyId: string): void {
  if (expandedStoryIds.has(storyId)) {
    expandedStoryIds.delete(storyId);
    if (addingTaskForStoryId === storyId) addingTaskForStoryId = null;
  } else {
    expandedStoryIds.add(storyId);
  }
  renderStories();
}

// ─── Task handlers ────────────────────────────────────────────────────────────

function handleAddTask(form: HTMLFormElement): void {
  const storyId = form.dataset.storyId;
  if (!storyId) return;

  const data = new FormData(form);
  const name = (data.get("name") as string).trim();
  const description = (data.get("description") as string).trim();
  const priority = (data.get("priority") as Priority) || "medium";
  const estimatedHours = parseFloat(data.get("estimatedHours") as string) || 1;

  if (!name || !description) { alert("Nazwa i opis zadania nie mogą być puste."); return; }

  taskApi.create({ name, description, priority, storyId, estimatedHours });
  addingTaskForStoryId = null;
  renderStories();
  if (activeTab === "kanban") renderKanban();
}

function handleDeleteTask(id: string): void {
  if (!confirm("Czy na pewno chcesz usunąć to zadanie?")) return;
  taskApi.delete(id);
  renderStories();
  if (activeTab === "kanban") renderKanban();
}

// ─── Task modal handlers ──────────────────────────────────────────────────────

function handleSaveTask(): void {
  if (!detailTaskId) return;
  const name = modalEditName.value.trim();
  const description = modalEditDesc.value.trim();
  const priority = modalEditPriority.value as Priority;
  const estimatedHours = parseFloat(modalEditEstimated.value) || 0;
  if (!name || !description) { alert("Nazwa i opis nie mogą być puste."); return; }

  taskApi.update(detailTaskId, { name, description, priority, estimatedHours });
  renderTaskModal();
  renderStories();
  if (activeTab === "kanban") renderKanban();
}

function handleAssignUser(): void {
  if (!detailTaskId) return;
  const userId = modalUserSelect.value;
  if (!userId) { alert("Wybierz użytkownika."); return; }

  const task = taskApi.getById(detailTaskId);
  if (!task || task.status === "done") return;

  const isTodo = task.status === "todo";

  taskApi.update(detailTaskId, {
    assignedUserId: userId,
    ...(isTodo
      ? { status: "doing" as TaskStatus, startedAt: new Date().toISOString() }
      : {}),
  });

  // Auto-change story status todo → doing
  if (isTodo) {
    const story = storyApi.getById(task.storyId);
    if (story && story.status === "todo") {
      storyApi.updateStatus(task.storyId, "doing");
    }
  }

  renderTaskModal();
  renderStories();
  if (activeTab === "kanban") renderKanban();
}

function handleMarkAsDone(): void {
  if (!detailTaskId) return;
  const task = taskApi.getById(detailTaskId);
  if (!task || task.status !== "doing") return;

  const realizedHours = parseFloat(modalRealizedHours.value) || 0;

  taskApi.update(detailTaskId, {
    status: "done",
    finishedAt: new Date().toISOString(),
    realizedHours,
  });

  // Auto-change story status if all tasks are done
  const storyTasks = taskApi.getByStory(task.storyId);
  const allDone = storyTasks.every((t: Task) => t.id === detailTaskId || t.status === "done");
  if (allDone && storyTasks.length > 0) {
    storyApi.updateStatus(task.storyId, "done");
  }

  renderTaskModal();
  renderStories();
  if (activeTab === "kanban") renderKanban();
}

// ─── Tab navigation ───────────────────────────────────────────────────────────

function switchTab(tab: "stories" | "kanban"): void {
  activeTab = tab;
  tabBtns.forEach((btn) =>
    btn.classList.toggle("tab-btn--active", btn.dataset.tab === tab)
  );
  tabStories.style.display = tab === "stories" ? "block" : "none";
  tabKanban.style.display = tab === "kanban" ? "block" : "none";
  if (tab === "kanban") renderKanban();
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function updateFilterButtons(): void {
  filterBtns.forEach((btn) =>
    btn.classList.toggle("filter-btn--active", btn.dataset.filter === activeStoryFilter)
  );
}

// ─── Event listeners ──────────────────────────────────────────────────────────

projectForm.addEventListener("submit", handleProjectSubmit);
projectCancelBtn.addEventListener("click", resetProjectForm);

storyForm.addEventListener("submit", handleStorySubmit);
storyCancelBtn.addEventListener("click", resetStoryForm);

filterBtns.forEach((btn) =>
  btn.addEventListener("click", () => {
    activeStoryFilter = btn.dataset.filter as "all" | Status;
    updateFilterButtons();
    renderStories();
  })
);

tabBtns.forEach((btn) =>
  btn.addEventListener("click", () => switchTab(btn.dataset.tab as "stories" | "kanban"))
);

// Modal
modalCloseBtn.addEventListener("click", closeTaskModal);
taskModalOverlay.addEventListener("click", (e) => {
  if (e.target === taskModalOverlay) closeTaskModal();
});
modalSaveBtn.addEventListener("click", handleSaveTask);
modalAssignBtn.addEventListener("click", handleAssignUser);
modalDoneBtn.addEventListener("click", handleMarkAsDone);

// ─── Init ─────────────────────────────────────────────────────────────────────

renderUser();
resetProjectForm();
resetStoryForm();
renderProjects();
renderActiveProject();
updateFilterButtons();
