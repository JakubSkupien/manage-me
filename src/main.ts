import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { Modal, Tab } from "bootstrap";
import "./style.css";
import { ProjectStorageApi } from "./api/projectStorage";
import { StoryStorageApi } from "./api/storyStorage";
import { ActiveProjectStorage } from "./api/activeProjectStorage";
import { TaskStorageApi } from "./api/taskStorage";
import { ThemeStorageApi } from "./api/themeStorage";
import { currentUser, users } from "./mocks/currentUser";
import { Priority, Status } from "./models/Story";
import { Task, TaskStatus } from "./models/Task";
import { User, Role } from "./models/User";

// ─── API instances ────────────────────────────────────────────────────────────

const projectApi = new ProjectStorageApi();
const storyApi = new StoryStorageApi();
const activeProjectStorage = new ActiveProjectStorage();
const taskApi = new TaskStorageApi();
const themeApi = new ThemeStorageApi();

// ─── Bootstrap modal instance ─────────────────────────────────────────────────

let taskModalInstance: Modal | null = null;

function getOrCreateModal(): Modal {
  if (!taskModalInstance) {
    const el = document.getElementById("taskModal");
    if (el) {
      taskModalInstance = new Modal(el);
      el.addEventListener("hidden.bs.modal", () => {
        detailTaskId = null;
      });
    }
  }
  return taskModalInstance!;
}

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

// ─── Bootstrap badge class helpers ────────────────────────────────────────────

function priorityBadgeClass(priority: Priority): string {
  const map: Record<Priority, string> = {
    low: "success",
    medium: "warning",
    high: "danger",
  };
  return map[priority];
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    todo: "secondary",
    doing: "primary",
    done: "success",
  };
  return map[status] ?? "secondary";
}

function roleBadgeClass(role: Role): string {
  const map: Record<Role, string> = {
    admin: "warning",
    developer: "primary",
    devops: "success",
  };
  return map[role];
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

// Task modal fields (IDs unchanged — referenced by JS)
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

// Theme
const themeToggleBtn = document.getElementById("theme-toggle") as HTMLButtonElement;
const themeIconEl = document.getElementById("theme-icon") as HTMLElement;
const themeLabelEl = document.getElementById("theme-label") as HTMLSpanElement;

// ─── State ────────────────────────────────────────────────────────────────────

let editingProjectId: string | null = null;
let editingStoryId: string | null = null;
let activeStoryFilter: "all" | Status = "all";
const expandedStoryIds = new Set<string>();
let addingTaskForStoryId: string | null = null;
let detailTaskId: string | null = null;

// ─── Theme ────────────────────────────────────────────────────────────────────

function updateThemeToggleIcon(): void {
  const isDark = themeApi.getTheme() === "dark";
  themeIconEl.className = isDark ? "bi bi-moon-fill" : "bi bi-sun-fill";
  themeLabelEl.textContent = isDark ? "Ciemny" : "Jasny";
}

// ─── Render: user ─────────────────────────────────────────────────────────────

function renderUser(): void {
  userNameEl.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
  userRoleEl.className = `badge text-bg-${roleBadgeClass(currentUser.role)}`;
  userRoleEl.textContent = ROLE_LABELS[currentUser.role];
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
    li.className = `list-group-item list-group-item-action py-3 px-0${isActive ? " active-project-item" : ""}`;
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap">
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
            <h6 class="mb-0 fw-semibold">${escapeHtml(project.name)}</h6>
            ${isActive ? '<span class="badge text-bg-primary"><i class="bi bi-star-fill me-1"></i>Aktywny</span>' : ""}
          </div>
          <p class="mb-0 text-muted small">${escapeHtml(project.description)}</p>
        </div>
        <div class="d-flex gap-1 flex-shrink-0 flex-wrap">
          ${!isActive
            ? `<button class="btn btn-outline-success btn-sm btn-activate" data-id="${project.id}">
                <i class="bi bi-lightning-fill me-1"></i>Ustaw aktywny
               </button>`
            : ""}
          <button class="btn btn-outline-warning btn-sm btn-edit" data-id="${project.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm btn-delete" data-id="${project.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
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
  renderKanban();
}

// ─── Render: tasks HTML (inside expanded story) ───────────────────────────────

function renderTasksHtml(storyId: string, tasks: Task[]): string {
  const isAddingTask = addingTaskForStoryId === storyId;

  const taskItems = tasks.length > 0
    ? tasks.map((task: Task) => `
        <li class="list-group-item list-group-item-action px-2 py-2 task-card">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-1 flex-wrap">
            <span class="fw-semibold small">${escapeHtml(task.name)}</span>
            <div class="d-flex gap-1 flex-wrap">
              <span class="badge text-bg-${priorityBadgeClass(task.priority)}">${PRIORITY_LABELS[task.priority]}</span>
              <span class="badge text-bg-${statusBadgeClass(task.status)}">${STATUS_LABELS[task.status as Status]}</span>
            </div>
          </div>
          ${task.assignedUserId
            ? `<div class="text-muted small mb-1">
                <i class="bi bi-person-fill me-1"></i>${escapeHtml(getUserName(task.assignedUserId))}
               </div>`
            : ""}
          <div class="d-flex gap-1 mt-1">
            <button class="btn btn-outline-secondary btn-sm btn-task-details" data-task-id="${task.id}">
              <i class="bi bi-info-circle me-1"></i>Szczegóły
            </button>
            <button class="btn btn-outline-danger btn-sm btn-task-delete" data-task-id="${task.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </li>
      `).join("")
    : `<li class="list-group-item text-muted small text-center py-2">
        <i class="bi bi-inbox me-1"></i>Brak zadań w tej historyjce.
       </li>`;

  const taskFormHtml = isAddingTask
    ? `<div class="task-inline-form p-3 mt-2 rounded border">
        <form class="task-inline-form-el" data-story-id="${storyId}" novalidate>
          <div class="mb-2">
            <label class="form-label form-label-sm fw-semibold">Nazwa zadania</label>
            <input type="text" class="form-control form-control-sm" name="name"
              placeholder="Wpisz nazwę zadania" autocomplete="off" />
          </div>
          <div class="mb-2">
            <label class="form-label form-label-sm fw-semibold">Opis</label>
            <textarea class="form-control form-control-sm" name="description"
              rows="2" placeholder="Wpisz opis zadania"></textarea>
          </div>
          <div class="row g-2 mb-2">
            <div class="col">
              <label class="form-label form-label-sm fw-semibold">Priorytet</label>
              <select class="form-select form-select-sm" name="priority">
                <option value="low">Niski</option>
                <option value="medium" selected>Średni</option>
                <option value="high">Wysoki</option>
              </select>
            </div>
            <div class="col">
              <label class="form-label form-label-sm fw-semibold">Szacowane godziny</label>
              <input type="number" class="form-control form-control-sm" name="estimatedHours"
                min="0" step="0.5" value="1" />
            </div>
          </div>
          <div class="d-flex gap-2">
            <button type="submit" class="btn btn-primary btn-sm">
              <i class="bi bi-plus-lg me-1"></i>Dodaj zadanie
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-cancel-task">Anuluj</button>
          </div>
        </form>
       </div>`
    : `<div class="mt-2">
        <button class="btn btn-outline-primary btn-sm btn-add-task" data-story-id="${storyId}">
          <i class="bi bi-plus-lg me-1"></i>Dodaj zadanie
        </button>
       </div>`;

  return `<div class="task-section mt-3 pt-3">
    <ul class="list-group list-group-flush mb-1">${taskItems}</ul>
    ${taskFormHtml}
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
    li.className = "list-group-item py-3 px-0";
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-start gap-2 flex-wrap">
        <div class="flex-grow-1 min-w-0">
          <div class="d-flex align-items-center gap-2 flex-wrap mb-1">
            <h6 class="mb-0 fw-semibold">${escapeHtml(story.name)}</h6>
            <span class="badge text-bg-${priorityBadgeClass(story.priority)}">${PRIORITY_LABELS[story.priority]}</span>
            <span class="badge text-bg-${statusBadgeClass(story.status)}">${STATUS_LABELS[story.status]}</span>
          </div>
          <p class="mb-1 text-muted small">${escapeHtml(story.description)}</p>
          <div class="text-muted" style="font-size:.75rem">
            <i class="bi bi-calendar3 me-1"></i>${formatDate(story.createdAt)}
            &nbsp;·&nbsp;
            <i class="bi bi-person me-1"></i>${escapeHtml(getUserName(story.ownerId))}
          </div>
        </div>
        <div class="d-flex gap-1 flex-wrap flex-shrink-0">
          <button class="btn btn-outline-primary btn-sm btn-toggle-tasks" data-story-id="${story.id}">
            <i class="bi bi-list-task me-1"></i>Zadania (${tasks.length})
            <i class="bi bi-chevron-${isExpanded ? "up" : "down"} ms-1"></i>
          </button>
          <button class="btn btn-outline-warning btn-sm btn-edit" data-id="${story.id}">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm btn-delete" data-id="${story.id}">
            <i class="bi bi-trash"></i>
          </button>
        </div>
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
  storyList.querySelectorAll<HTMLFormElement>(".task-inline-form-el").forEach((form) =>
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
      list.innerHTML = `<li class="text-muted text-center small py-3">
        <i class="bi bi-inbox"></i><br>Brak zadań
      </li>`;
      return;
    }
    group.forEach((task: Task) => {
      const story = storyMap.get(task.storyId);
      const assignee = task.assignedUserId ? getUserById(task.assignedUserId) : null;
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="card mb-2 shadow-sm border-0 kanban-card">
          <div class="card-body p-3">
            <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
              <span class="fw-semibold small flex-grow-1">${escapeHtml(task.name)}</span>
              <span class="badge text-bg-${priorityBadgeClass(task.priority)} flex-shrink-0">
                ${PRIORITY_LABELS[task.priority]}
              </span>
            </div>
            <div class="text-muted small mb-1">
              <i class="bi bi-card-text me-1"></i>${escapeHtml(story?.name ?? "—")}
            </div>
            ${assignee
              ? `<div class="text-muted small mb-2">
                  <i class="bi bi-person-fill me-1"></i>${escapeHtml(assignee.firstName)} ${escapeHtml(assignee.lastName)}
                 </div>`
              : ""}
            <button class="btn btn-outline-secondary btn-sm w-100 btn-task-details"
              data-task-id="${task.id}">
              <i class="bi bi-info-circle me-1"></i>Szczegóły
            </button>
          </div>
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

// ─── Task modal ───────────────────────────────────────────────────────────────

function openTaskModal(taskId: string): void {
  detailTaskId = taskId;
  renderTaskModal();
  getOrCreateModal().show();
}

function closeTaskModal(): void {
  getOrCreateModal().hide();
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

  // Read-only details using Bootstrap dl.row
  modalTaskDetails.innerHTML = `
    <dl class="row mb-0 small">
      <dt class="col-5 fw-normal text-muted">Status</dt>
      <dd class="col-7">
        <span class="badge text-bg-${statusBadgeClass(task.status)}">${STATUS_LABELS[task.status as Status]}</span>
      </dd>
      <dt class="col-5 fw-normal text-muted">Historyjka</dt>
      <dd class="col-7">${escapeHtml(story?.name ?? "(brak)")}</dd>
      <dt class="col-5 fw-normal text-muted">Data dodania</dt>
      <dd class="col-7">${formatDate(task.createdAt)}</dd>
      <dt class="col-5 fw-normal text-muted">Data startu</dt>
      <dd class="col-7">${formatDate(task.startedAt)}</dd>
      <dt class="col-5 fw-normal text-muted">Data zakończenia</dt>
      <dd class="col-7">${formatDate(task.finishedAt)}</dd>
      <dt class="col-5 fw-normal text-muted">Szacowane godziny</dt>
      <dd class="col-7">${task.estimatedHours} h</dd>
      <dt class="col-5 fw-normal text-muted">Zrealizowane godziny</dt>
      <dd class="col-7">${task.realizedHours} h</dd>
      <dt class="col-5 fw-normal text-muted">Przypisana osoba</dt>
      <dd class="col-7">${
        assignee
          ? `${escapeHtml(assignee.firstName)} ${escapeHtml(assignee.lastName)}
             <span class="badge text-bg-${roleBadgeClass(assignee.role)} ms-1">${ROLE_LABELS[assignee.role]}</span>`
          : '<span class="text-muted">Brak przypisania</span>'
      }</dd>
    </dl>
  `;

  // Assign section: visible when not done
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
  projectSubmitBtn.innerHTML = '<i class="bi bi-plus-lg me-1"></i>Dodaj';
  projectCancelBtn.style.display = "none";
}

function startEditProject(id: string): void {
  const project = projectApi.getById(id);
  if (!project) return;
  editingProjectId = id;
  projectNameInput.value = project.name;
  projectDescInput.value = project.description;
  projectFormTitle.textContent = "Edytuj projekt";
  projectSubmitBtn.innerHTML = '<i class="bi bi-floppy me-1"></i>Zapisz';
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
  expandedStoryIds.clear();
  addingTaskForStoryId = null;
  updateFilterButtons();

  // Reset to stories tab
  const storiesTabEl = document.getElementById("stories-tab");
  if (storiesTabEl) new Tab(storiesTabEl).show();

  renderProjects();
  renderActiveProject();
}

function handleDeleteProject(id: string): void {
  if (!confirm("Czy na pewno chcesz usunąć ten projekt? Usunięte zostaną też jego historyjki i zadania.")) return;
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
  storySubmitBtn.innerHTML = '<i class="bi bi-plus-lg me-1"></i>Dodaj';
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
  storySubmitBtn.innerHTML = '<i class="bi bi-floppy me-1"></i>Zapisz';
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
  renderKanban();
}

function handleDeleteStory(id: string): void {
  if (!confirm("Czy na pewno chcesz usunąć tę historyjkę? Usunięte zostaną też jej zadania.")) return;
  taskApi.deleteByStory(id);
  storyApi.delete(id);
  expandedStoryIds.delete(id);
  if (addingTaskForStoryId === id) addingTaskForStoryId = null;
  renderStories();
  renderKanban();
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
  renderKanban();
}

function handleDeleteTask(id: string): void {
  if (!confirm("Czy na pewno chcesz usunąć to zadanie?")) return;
  taskApi.delete(id);
  renderStories();
  renderKanban();
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
  renderKanban();
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
    ...(isTodo ? { status: "doing" as TaskStatus, startedAt: new Date().toISOString() } : {}),
  });

  if (isTodo) {
    const story = storyApi.getById(task.storyId);
    if (story && story.status === "todo") storyApi.updateStatus(task.storyId, "doing");
  }

  renderTaskModal();
  renderStories();
  renderKanban();
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

  const storyTasks = taskApi.getByStory(task.storyId);
  const allDone = storyTasks.every((t: Task) => t.id === detailTaskId || t.status === "done");
  if (allDone && storyTasks.length > 0) storyApi.updateStatus(task.storyId, "done");

  renderTaskModal();
  renderStories();
  renderKanban();
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function updateFilterButtons(): void {
  filterBtns.forEach((btn) => {
    const isActive = btn.dataset.filter === activeStoryFilter;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", String(isActive));
  });
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

// Render kanban when its tab becomes visible
document.getElementById("kanban-tab")?.addEventListener("shown.bs.tab", () => {
  renderKanban();
});

// Modal event listeners (attached once)
modalSaveBtn.addEventListener("click", handleSaveTask);
modalAssignBtn.addEventListener("click", handleAssignUser);
modalDoneBtn.addEventListener("click", handleMarkAsDone);

// Theme toggle
themeToggleBtn.addEventListener("click", () => {
  themeApi.toggleTheme();
  updateThemeToggleIcon();
});

// ─── Init ─────────────────────────────────────────────────────────────────────

themeApi.applySavedTheme();
updateThemeToggleIcon();
renderUser();
resetProjectForm();
resetStoryForm();
renderProjects();
renderActiveProject();
updateFilterButtons();
