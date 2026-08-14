/**
 * TaskFlow - Modern Todo App Frontend Controller
 * Interacts with Spring Boot REST API (/api/todos)
 */

// Application State
const state = {
  todos: [],
  totalCount: 0,
  completedCount: 0,
  pendingCount: 0,
  currentFilter: 'all', // 'all' | 'pending' | 'completed'
  searchQuery: '',
  sortBy: 'createdat',
  isLoading: false,
  pendingAction: null, // Used for confirm modal callback
};

// API Base URL (Relative path to work locally and on any EC2 / custom domain)
const API_BASE = '/api/todos';

// DOM Elements
const elements = {
  // Stats
  statTotalCount: document.getElementById('stat-total-count'),
  statPendingCount: document.getElementById('stat-pending-count'),
  statCompletedCount: document.getElementById('stat-completed-count'),
  statCompletionPct: document.getElementById('stat-completion-pct'),
  statProgressBar: document.getElementById('stat-progress-bar'),

  // Filters & Search
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),
  filterTabs: document.querySelectorAll('.filter-tab-btn'),
  sortSelect: document.getElementById('sort-select'),
  btnRefresh: document.getElementById('btn-refresh'),

  // Bulk Actions
  bulkActionsBtn: document.getElementById('bulk-actions-btn'),
  bulkActionsDropdown: document.getElementById('bulk-actions-dropdown'),
  btnDeleteCompleted: document.getElementById('btn-delete-completed'),
  btnDeleteAll: document.getElementById('btn-delete-all'),

  // List & State Views
  loadingSkeleton: document.getElementById('task-loading-skeleton'),
  itemsContainer: document.getElementById('task-items-container'),
  emptyState: document.getElementById('task-empty-state'),
  emptyStateSubtitle: document.getElementById('empty-state-subtitle'),
  btnEmptyCreate: document.getElementById('btn-empty-create'),

  // Task Create/Edit Modal
  taskModal: document.getElementById('task-modal'),
  taskModalCard: document.getElementById('task-modal-card'),
  modalTitle: document.getElementById('modal-title'),
  taskForm: document.getElementById('task-form'),
  formTaskId: document.getElementById('form-task-id'),
  formTitle: document.getElementById('form-title'),
  formTitleError: document.getElementById('form-title-error'),
  formDescription: document.getElementById('form-description'),
  formPriority: document.getElementById('form-priority'),
  formDueDate: document.getElementById('form-duedate'),
  formCompletedWrapper: document.getElementById('form-completed-wrapper'),
  formCompleted: document.getElementById('form-completed'),
  btnOpenCreateModal: document.getElementById('btn-open-create-modal'),
  btnCloseModal: document.getElementById('btn-close-modal'),
  btnCancelModal: document.getElementById('btn-cancel-modal'),
  btnSubmitText: document.getElementById('btn-submit-text'),

  // Confirmation Modal
  confirmModal: document.getElementById('confirm-modal'),
  confirmModalTitle: document.getElementById('confirm-modal-title'),
  confirmModalDesc: document.getElementById('confirm-modal-desc'),
  btnConfirmCancel: document.getElementById('btn-confirm-cancel'),
  btnConfirmProceed: document.getElementById('btn-confirm-proceed'),

  // Toast Container
  toastContainer: document.getElementById('toast-container'),
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchTodos();
});

// Setup Event Listeners
function setupEventListeners() {
  // Refresh button
  elements.btnRefresh.addEventListener('click', () => {
    fetchTodos(true);
    showToast('Task list refreshed', 'info');
  });

  // Search input with debounce
  let searchTimeout = null;
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.trim();
    elements.searchClearBtn.classList.toggle('hidden', state.searchQuery.length === 0);
    
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      fetchTodos();
    }, 300);
  });

  // Search clear button
  elements.searchClearBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchQuery = '';
    elements.searchClearBtn.classList.add('hidden');
    fetchTodos();
  });

  // Filter Tabs
  elements.filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      elements.filterTabs.forEach((t) => {
        t.classList.remove('active-tab');
        t.classList.add('text-slate-600');
      });
      tab.classList.add('active-tab');
      tab.classList.remove('text-slate-600');

      state.currentFilter = tab.dataset.filter;
      fetchTodos();
    });
  });

  // Sort Dropdown
  elements.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    fetchTodos();
  });

  // Bulk Actions Dropdown Toggle
  elements.bulkActionsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.bulkActionsDropdown.classList.toggle('hidden');
  });

  document.addEventListener('click', () => {
    elements.bulkActionsDropdown.classList.add('hidden');
  });

  // Clear Completed Tasks
  elements.btnDeleteCompleted.addEventListener('click', () => {
    elements.bulkActionsDropdown.classList.add('hidden');
    if (state.completedCount === 0) {
      showToast('No completed tasks to clear', 'info');
      return;
    }
    openConfirmModal(
      'Clear Completed Tasks?',
      `Are you sure you want to delete all ${state.completedCount} completed tasks?`,
      () => deleteCompletedTasks()
    );
  });

  // Clear All Tasks
  elements.btnDeleteAll.addEventListener('click', () => {
    elements.bulkActionsDropdown.classList.add('hidden');
    if (state.totalCount === 0) {
      showToast('No tasks to delete', 'info');
      return;
    }
    openConfirmModal(
      'Clear All Tasks?',
      `Are you sure you want to delete ALL ${state.totalCount} tasks? This cannot be undone.`,
      () => deleteAllTasks()
    );
  });

  // Modal Open / Close Handlers
  elements.btnOpenCreateModal.addEventListener('click', () => openCreateModal());
  elements.btnEmptyCreate.addEventListener('click', () => openCreateModal());
  elements.btnCloseModal.addEventListener('click', () => closeModal());
  elements.btnCancelModal.addEventListener('click', () => closeModal());

  // Close modal on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeConfirmModal();
    }
  });

  // Task Form Submit (Create or Edit)
  elements.taskForm.addEventListener('submit', handleTaskFormSubmit);

  // Confirm Modal Action Button
  elements.btnConfirmProceed.addEventListener('click', () => {
    if (typeof state.pendingAction === 'function') {
      state.pendingAction();
    }
    closeConfirmModal();
  });

  elements.btnConfirmCancel.addEventListener('click', closeConfirmModal);
}

// Fetch Todos from Backend API
async function fetchTodos(showLoadingSpinner = true) {
  if (showLoadingSpinner) {
    elements.loadingSkeleton.classList.remove('hidden');
    elements.itemsContainer.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
  }

  try {
    const params = new URLSearchParams();
    
    // Filter parameter
    if (state.currentFilter === 'pending') {
      params.append('completed', 'false');
    } else if (state.currentFilter === 'completed') {
      params.append('completed', 'true');
    }

    // Search parameter
    if (state.searchQuery) {
      params.append('search', state.searchQuery);
    }

    // Sort parameter
    if (state.sortBy) {
      params.append('sortBy', state.sortBy);
    }

    const response = await fetch(`${API_BASE}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    state.todos = data.todos || [];
    state.totalCount = data.totalCount || 0;
    state.completedCount = data.completedCount || 0;
    state.pendingCount = data.pendingCount || 0;

    updateStats();
    renderTodoList();
  } catch (error) {
    console.error('Error fetching todos:', error);
    showToast('Failed to load tasks. Please check your connection.', 'error');
    elements.itemsContainer.innerHTML = `
      <div class="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center text-rose-700">
        <i class="fa-solid fa-circle-exclamation text-2xl mb-2"></i>
        <h4 class="font-bold text-sm">Unable to connect to backend server</h4>
        <p class="text-xs text-rose-600 mt-1">Make sure the Spring Boot service is running on port 8080.</p>
        <button onclick="fetchTodos()" class="mt-3 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold cursor-pointer">
          Retry
        </button>
      </div>
    `;
    elements.itemsContainer.classList.remove('hidden');
  } finally {
    elements.loadingSkeleton.classList.add('hidden');
  }
}

// Update Header Statistics
function updateStats() {
  elements.statTotalCount.textContent = state.totalCount;
  elements.statPendingCount.textContent = state.pendingCount;
  elements.statCompletedCount.textContent = state.completedCount;

  const percentage = state.totalCount > 0 
    ? Math.round((state.completedCount / state.totalCount) * 100) 
    : 0;

  elements.statCompletionPct.textContent = `${percentage}%`;
  elements.statProgressBar.style.width = `${percentage}%`;
}

// Render Task List
function renderTodoList() {
  elements.itemsContainer.innerHTML = '';

  if (state.todos.length === 0) {
    elements.itemsContainer.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
    
    if (state.searchQuery) {
      elements.emptyStateSubtitle.textContent = `No tasks found matching "${state.searchQuery}".`;
    } else if (state.currentFilter === 'pending') {
      elements.emptyStateSubtitle.textContent = 'Awesome! You have no pending tasks.';
    } else if (state.currentFilter === 'completed') {
      elements.emptyStateSubtitle.textContent = 'No completed tasks yet. Finish a task to see it here!';
    } else {
      elements.emptyStateSubtitle.textContent = 'Your task list is empty. Create your first task to get started!';
    }
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.itemsContainer.classList.remove('hidden');

  state.todos.forEach((todo) => {
    const card = createTaskCardElement(todo);
    elements.itemsContainer.appendChild(card);
  });
}

// Create Task Card Element
function createTaskCardElement(todo) {
  const card = document.createElement('div');
  card.className = `task-card bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
    todo.completed ? 'is-completed' : ''
  }`;
  card.dataset.id = todo.id;

  // Priority Badge Helper
  const priorityClass = getPriorityBadgeClass(todo.priority);
  const priorityLabel = todo.priority || 'MEDIUM';

  // Due Date Helper
  const dueDateInfo = formatDueDate(todo.dueDate);

  card.innerHTML = `
    <!-- Left Section: Checkbox & Info -->
    <div class="flex items-start gap-3.5 flex-1 min-w-0">
      <!-- Checkbox -->
      <button 
        type="button" 
        class="custom-checkbox mt-0.5 shrink-0" 
        data-action="toggle" 
        data-id="${todo.id}" 
        title="${todo.completed ? 'Mark as pending' : 'Mark as completed'}"
      >
        <input type="checkbox" ${todo.completed ? 'checked' : ''} class="sr-only">
      </button>

      <!-- Task Title & Meta -->
      <div class="flex-1 min-w-0 space-y-1">
        <div class="flex flex-wrap items-center gap-2">
          <h3 class="task-title text-sm font-semibold text-slate-800 break-words">${escapeHtml(todo.title)}</h3>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${priorityClass}">
            ${priorityLabel}
          </span>
          ${dueDateInfo.html}
        </div>
        
        ${todo.description ? `<p class="task-desc text-xs text-slate-500 line-clamp-2 leading-relaxed">${escapeHtml(todo.description)}</p>` : ''}
        
        <div class="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
          <span>Created: ${formatTimestamp(todo.createdAt)}</span>
          ${todo.updatedAt !== todo.createdAt ? `<span>&bull; Updated: ${formatTimestamp(todo.updatedAt)}</span>` : ''}
        </div>
      </div>
    </div>

    <!-- Right Section: Actions -->
    <div class="flex items-center gap-1.5 self-end sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
      <button 
        type="button" 
        class="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1" 
        data-action="edit" 
        data-id="${todo.id}"
        title="Edit task"
      >
        <i class="fa-regular fa-pen-to-square"></i>
        <span class="sm:hidden text-xs font-medium">Edit</span>
      </button>
      
      <button 
        type="button" 
        class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1" 
        data-action="delete" 
        data-id="${todo.id}"
        title="Delete task"
      >
        <i class="fa-regular fa-trash-can"></i>
        <span class="sm:hidden text-xs font-medium">Delete</span>
      </button>
    </div>
  `;

  // Attach card event listeners
  const toggleBtn = card.querySelector('[data-action="toggle"]');
  toggleBtn.addEventListener('click', () => toggleTodo(todo.id));

  const editBtn = card.querySelector('[data-action="edit"]');
  editBtn.addEventListener('click', () => openEditModal(todo));

  const deleteBtn = card.querySelector('[data-action="delete"]');
  deleteBtn.addEventListener('click', () => {
    openConfirmModal('Delete Task?', `Are you sure you want to delete "${todo.title}"?`, () => deleteSingleTodo(todo.id));
  });

  return card;
}

// Format Priority Class
function getPriorityBadgeClass(priority) {
  switch (priority) {
    case 'HIGH':
      return 'badge-priority-high';
    case 'LOW':
      return 'badge-priority-low';
    case 'MEDIUM':
    default:
      return 'badge-priority-medium';
  }
}

// Format Due Date Tag
function formatDueDate(dueDateStr) {
  if (!dueDateStr) return { html: '' };

  const due = new Date(dueDateStr);
  const now = new Date();
  const diffHours = (due - now) / (1000 * 60 * 60);

  let badgeClass = 'badge-due-normal';
  let label = due.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (due < now) {
    badgeClass = 'badge-overdue';
    label = `Overdue: ${label}`;
  } else if (diffHours < 24) {
    badgeClass = 'badge-due-soon';
    label = `Due Soon: ${label}`;
  }

  return {
    html: `<span class="text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${badgeClass}">
      <i class="fa-regular fa-calendar text-[9px]"></i> ${label}
    </span>`
  };
}

// Format Creation / Update Timestamps
function formatTimestamp(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Escape HTML for XSS prevention
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Toggle Todo Completion Status (PATCH /api/todos/{id}/toggle)
async function toggleTodo(id) {
  try {
    const response = await fetch(`${API_BASE}/${id}/toggle`, {
      method: 'PATCH',
    });

    if (!response.ok) {
      throw new Error(`Failed to toggle todo status: ${response.status}`);
    }

    const updated = await response.json();
    showToast(updated.completed ? 'Task completed! 🎉' : 'Task marked as pending', 'success');
    fetchTodos(false);
  } catch (error) {
    console.error('Error toggling todo:', error);
    showToast('Failed to update task status.', 'error');
  }
}

// Open Create Modal
function openCreateModal() {
  elements.modalTitle.innerHTML = '<i class="fa-solid fa-plus-circle text-brand-600"></i> Create New Task';
  elements.btnSubmitText.textContent = 'Create Task';
  elements.formTaskId.value = '';
  elements.formTitle.value = '';
  elements.formDescription.value = '';
  elements.formPriority.value = 'MEDIUM';
  elements.formDueDate.value = '';
  elements.formCompletedWrapper.classList.add('hidden');
  elements.formTitleError.classList.add('hidden');

  showModal();
}

// Open Edit Modal (Prefill with task data)
function openEditModal(todo) {
  elements.modalTitle.innerHTML = '<i class="fa-solid fa-pen-to-square text-brand-600"></i> Edit Task';
  elements.btnSubmitText.textContent = 'Save Changes';
  elements.formTaskId.value = todo.id;
  elements.formTitle.value = todo.title;
  elements.formDescription.value = todo.description || '';
  elements.formPriority.value = todo.priority || 'MEDIUM';
  
  if (todo.dueDate) {
    // Format LocalDateTime string to yyyy-MM-ddThh:mm for input[type="datetime-local"]
    const dateObj = new Date(todo.dueDate);
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);
    elements.formDueDate.value = localISOTime;
  } else {
    elements.formDueDate.value = '';
  }

  elements.formCompleted.checked = todo.completed;
  elements.formCompletedWrapper.classList.remove('hidden');
  elements.formTitleError.classList.add('hidden');

  showModal();
}

// Show/Hide Modal Helpers
function showModal() {
  elements.taskModal.classList.remove('hidden');
  setTimeout(() => {
    elements.taskModal.classList.add('modal-active');
    elements.formTitle.focus();
  }, 10);
}

function closeModal() {
  elements.taskModal.classList.remove('modal-active');
  setTimeout(() => {
    elements.taskModal.classList.add('hidden');
  }, 150);
}

// Handle Form Submission (Create vs Update)
async function handleTaskFormSubmit(e) {
  e.preventDefault();

  const title = elements.formTitle.value.trim();
  const description = elements.formDescription.value.trim() || null;
  const priority = elements.formPriority.value;
  const dueDateVal = elements.formDueDate.value;
  const dueDate = dueDateVal ? new Date(dueDateVal).toISOString() : null;
  const taskId = elements.formTaskId.value;

  if (!title) {
    elements.formTitleError.textContent = 'Title is required and cannot be blank.';
    elements.formTitleError.classList.remove('hidden');
    elements.formTitle.focus();
    return;
  }

  elements.formTitleError.classList.add('hidden');
  elements.btnSubmitText.textContent = 'Saving...';

  try {
    if (taskId) {
      // UPDATE Existing Task (PUT /api/todos/{id})
      const completed = elements.formCompleted.checked;
      const updatePayload = { title, description, priority, dueDate, completed };

      const res = await fetch(`${API_BASE}/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) throw new Error('Update failed');
      showToast('Task updated successfully!', 'success');
    } else {
      // CREATE New Task (POST /api/todos)
      const createPayload = { title, description, priority, dueDate };

      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload),
      });

      if (!res.ok) throw new Error('Create failed');
      showToast('New task created!', 'success');
    }

    closeModal();
    fetchTodos(false);
  } catch (error) {
    console.error('Form submission error:', error);
    showToast('Failed to save task. Please check server logs.', 'error');
  } finally {
    elements.btnSubmitText.textContent = taskId ? 'Save Changes' : 'Create Task';
  }
}

// Delete Single Task (DELETE /api/todos/{id})
async function deleteSingleTodo(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) throw new Error('Delete failed');
    showToast('Task deleted successfully', 'info');
    fetchTodos(false);
  } catch (error) {
    console.error('Delete error:', error);
    showToast('Failed to delete task.', 'error');
  }
}

// Delete All Completed Tasks (DELETE /api/todos?completedOnly=true)
async function deleteCompletedTasks() {
  try {
    const res = await fetch(`${API_BASE}?completedOnly=true`, {
      method: 'DELETE',
    });

    if (!res.ok) throw new Error('Delete completed failed');
    showToast('All completed tasks cleared', 'success');
    fetchTodos(false);
  } catch (error) {
    console.error('Delete completed error:', error);
    showToast('Failed to clear completed tasks.', 'error');
  }
}

// Delete All Tasks (DELETE /api/todos)
async function deleteAllTasks() {
  try {
    const res = await fetch(API_BASE, {
      method: 'DELETE',
    });

    if (!res.ok) throw new Error('Delete all failed');
    showToast('All tasks cleared', 'info');
    fetchTodos(false);
  } catch (error) {
    console.error('Delete all error:', error);
    showToast('Failed to clear all tasks.', 'error');
  }
}

// Confirmation Modal Helpers
function openConfirmModal(title, description, onProceed) {
  elements.confirmModalTitle.textContent = title;
  elements.confirmModalDesc.textContent = description;
  state.pendingAction = onProceed;

  elements.confirmModal.classList.remove('hidden');
  setTimeout(() => {
    elements.confirmModal.classList.add('modal-active');
  }, 10);
}

function closeConfirmModal() {
  elements.confirmModal.classList.remove('modal-active');
  setTimeout(() => {
    elements.confirmModal.classList.add('hidden');
    state.pendingAction = null;
  }, 150);
}

// Toast Notification System
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast-item px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2.5 max-w-xs';

  let icon = 'fa-solid fa-circle-info';
  let colors = 'bg-white text-slate-800 border-slate-200';

  if (type === 'success') {
    icon = 'fa-solid fa-circle-check text-emerald-500';
    colors = 'bg-white text-slate-800 border-emerald-200 shadow-emerald-500/5';
  } else if (type === 'error') {
    icon = 'fa-solid fa-circle-xmark text-rose-500';
    colors = 'bg-white text-slate-800 border-rose-200 shadow-rose-500/5';
  } else if (type === 'info') {
    icon = 'fa-solid fa-circle-info text-brand-500';
    colors = 'bg-white text-slate-800 border-brand-200';
  }

  toast.className += ` ${colors}`;
  toast.innerHTML = `<i class="${icon} text-sm"></i> <span>${escapeHtml(message)}</span>`;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-leave');
    setTimeout(() => {
      toast.remove();
    }, 200);
  }, 3000);
}
