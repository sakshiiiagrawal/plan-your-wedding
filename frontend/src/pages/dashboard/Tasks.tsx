/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useViewPreference } from '../../hooks/useViewPreference';
import { useUrlFilters } from '../../hooks/useUrlFilters';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Pagination } from '../../components/ui/Pagination';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import {
  useTasks,
  useTaskStats,
  useCreateTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useDeleteTask,
  useMembers,
} from '../../hooks/useApi';
import toast from 'react-hot-toast';
import Portal from '../../components/Portal';
import {
  HiOutlinePlus,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlinePencil,
  HiOutlineTrash,
  HiOutlineViewList,
  HiOutlineViewGrid,
  HiOutlineBell,
} from 'react-icons/hi';
import { SectionHeader, KPICard, SegmentedControl, Checkbox } from '../../components/ui';
import DatePicker from '../../components/ui/DatePicker';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDate, parseLocalDate, todayLocal } from '../../utils/date';

interface TaskFormData {
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: string;
  event_id: string | null;
  reminder_offset_days: number | null;
  reminder_date: string;
  reminder_repeat: string;
}

const DEFAULT_FORM: TaskFormData = {
  title: '',
  description: '',
  due_date: '',
  priority: 'medium',
  status: 'pending',
  assigned_to: '',
  event_id: null,
  reminder_offset_days: null,
  reminder_date: '',
  reminder_repeat: 'once',
};

function getTaskFormState(task?: any): TaskFormData {
  if (!task) return DEFAULT_FORM;
  return {
    title: task.title || '',
    description: task.description || '',
    due_date: task.due_date || '',
    priority: task.priority || 'medium',
    status: task.status || 'pending',
    assigned_to: task.assigned_to || '',
    event_id: task.event_id || null,
    reminder_offset_days: task.reminder_offset_days ?? null,
    reminder_date: task.reminder_date || '',
    reminder_repeat: task.reminder_repeat || 'once',
  };
}

// Effective reminder fire date: absolute date wins, else offset back from due date.
function reminderFireDate(task: any): string | null {
  if (task.reminder_date) return task.reminder_date;
  if (task.due_date && task.reminder_offset_days != null) {
    const d = parseLocalDate(task.due_date);
    d.setDate(d.getDate() - task.reminder_offset_days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return null;
}

// Small bell shown on cards/rows when a reminder is set; gold once it has fired.
function ReminderBell({ task }: { task: any }) {
  const fire = reminderFireDate(task);
  if (!fire) return null;
  const active = fire <= todayLocal() && task.status !== 'completed';
  return (
    <HiOutlineBell
      title={`Reminder ${fmtDate(fire)}`}
      style={{
        width: 12,
        height: 12,
        flexShrink: 0,
        color: active ? 'var(--gold)' : 'var(--ink-dim)',
      }}
    />
  );
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#dc2626',
  high: '#ea580c',
  medium: 'var(--gold)',
  low: 'var(--line-strong)',
};

const PRIORITY_PILL_STYLE: Record<string, React.CSSProperties> = {
  urgent: {
    background: 'rgba(220,38,38,0.08)',
    color: '#dc2626',
    border: '1px solid rgba(220,38,38,0.2)',
  },
  high: {
    background: 'rgba(234,88,12,0.08)',
    color: '#ea580c',
    border: '1px solid rgba(234,88,12,0.2)',
  },
  medium: {
    background: 'var(--gold-glow)',
    color: 'var(--gold-deep)',
    border: '1px solid rgba(176,141,62,0.3)',
  },
  low: { background: 'var(--bg-raised)', color: 'var(--ink-low)', border: '1px solid var(--line)' },
};

const COLUMNS = [
  { status: 'pending', label: 'To do', dotColor: 'var(--line-strong)' },
  { status: 'in_progress', label: 'In progress', dotColor: 'var(--gold)' },
  { status: 'completed', label: 'Done', dotColor: '#16a34a' },
];

const STATUS_CYCLE: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
};

// Module-level (stable reference) so useUrlFilters doesn't recompute on every render.
const TASK_FILTER_DEFAULTS = {
  status: 'all',
  priority: 'all',
  search: '',
  page: 1,
  per_page: 12,
};

function fmtDate(d: string) {
  if (!d) return '';
  return formatDate(d, { month: 'short', day: 'numeric' });
}

// ── Draggable task card ──────────────────────────────────────────────────────

function DraggableTaskCard({
  task,
  onEdit,
  onDelete,
  onCycleStatus,
  isDragging = false,
}: {
  task: any;
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
  onCycleStatus: (t: any) => void;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: task.id });

  const style: React.CSSProperties = {
    background: 'var(--bg-panel)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--line-soft)',
    borderLeft: `3px solid ${PRIORITY_COLOR[task.priority] ?? 'var(--line)'}`,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    cursor: 'grab',
    opacity: isDragging ? 0 : 1,
    transform: transform ? `translate(${transform.x}px, ${transform.y}px)` : undefined,
    userSelect: 'none',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onCycleStatus(task);
          }}
          style={{
            width: 16,
            height: 16,
            borderRadius: 4,
            flexShrink: 0,
            marginTop: 1,
            border: `1.5px solid ${task.status === 'completed' ? 'var(--gold)' : task.status === 'in_progress' ? 'var(--gold)' : 'var(--line-strong)'}`,
            background:
              task.status === 'completed'
                ? 'var(--gold)'
                : task.status === 'in_progress'
                  ? 'var(--gold-glow)'
                  : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {task.status === 'completed' && (
            <HiOutlineCheck style={{ width: 10, height: 10, color: 'white' }} />
          )}
        </button>
        <p
          style={{
            fontSize: 13,
            flex: 1,
            lineHeight: 1.4,
            color: task.status === 'completed' ? 'var(--ink-dim)' : 'var(--ink-high)',
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 24,
        }}
      >
        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            fontWeight: 500,
            textTransform: 'capitalize',
            ...PRIORITY_PILL_STYLE[task.priority],
          }}
        >
          {task.priority}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ReminderBell task={task} />
          {task.due_date && (
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>
              {fmtDate(task.due_date)}
            </span>
          )}
        </span>
      </div>

      {task.assigned_to && (
        <div style={{ paddingLeft: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="avatar" style={{ width: 18, height: 18, fontSize: 9 }}>
            {task.assigned_to.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 10, color: 'var(--ink-low)' }}>{task.assigned_to}</span>
        </div>
      )}

      <div style={{ paddingLeft: 24, display: 'flex', gap: 4 }}>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          style={{
            padding: '3px 5px',
            borderRadius: 4,
            color: 'var(--ink-dim)',
            background: 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)';
            (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)';
          }}
        >
          <HiOutlinePencil style={{ width: 12, height: 12 }} />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          style={{
            padding: '3px 5px',
            borderRadius: 4,
            color: 'var(--ink-dim)',
            background: 'transparent',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)';
            (e.currentTarget as HTMLElement).style.color = 'var(--err)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)';
          }}
        >
          <HiOutlineTrash style={{ width: 12, height: 12 }} />
        </button>
      </div>
    </div>
  );
}

// ── Droppable kanban column ──────────────────────────────────────────────────

function DroppableColumn({
  col,
  tasks,
  activeId,
  onEdit,
  onDelete,
  onCycleStatus,
}: {
  col: (typeof COLUMNS)[number];
  tasks: any[];
  activeId: string | null;
  onEdit: (t: any) => void;
  onDelete: (id: string) => void;
  onCycleStatus: (t: any) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status });

  return (
    <div
      ref={setNodeRef}
      style={{
        background: isOver ? 'rgba(176,141,62,0.06)' : 'var(--bg-raised)',
        borderRadius: 'var(--radius-lg)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        border: isOver ? '1.5px dashed var(--gold)' : '1.5px solid transparent',
        transition: 'all 150ms',
        minHeight: 120,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 4px 8px' }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: col.dotColor,
            flexShrink: 0,
          }}
        />
        <span className="uppercase-eyebrow" style={{ flex: 1, fontSize: 9 }}>
          {col.label}
        </span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>
          {tasks.length}
        </span>
      </div>

      {tasks.map((task: any) => (
        <DraggableTaskCard
          key={task.id}
          task={task}
          isDragging={task.id === activeId}
          onEdit={onEdit}
          onDelete={onDelete}
          onCycleStatus={onCycleStatus}
        />
      ))}

      {tasks.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '24px 0',
            fontSize: 12,
            fontStyle: 'italic',
            color: 'var(--ink-dim)',
          }}
        >
          Drop tasks here
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Tasks() {
  const [viewMode, setViewMode] = useViewPreference<'list' | 'kanban'>('tasks.viewMode', 'list');
  const [filters, setFilters] = useUrlFilters(TASK_FILTER_DEFAULTS);
  const statusFilter = filters.status;
  const priorityFilter = filters.priority;
  const setStatusFilter = (next: string) => setFilters({ status: next });
  const setPriorityFilter = (next: string) => setFilters({ priority: next });
  const setPage = (next: number) => setFilters({ page: next });

  // Local instant state for the search box; only pushed to the URL/query
  // after a debounce so typing doesn't fire a network request per keystroke.
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilters({ search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>(DEFAULT_FORM);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // "Custom date…" picked in the reminder select but no date chosen yet —
  // keeps the select on 'custom' while the DatePicker is still empty.
  const [customReminder, setCustomReminder] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  // Kanban needs every task (unpaginated, unfiltered) to fill its columns
  // correctly — pagination/search/status/priority filters apply to list view only.
  const queryParams =
    viewMode === 'kanban'
      ? {}
      : {
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
          ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
          page: filters.page,
          per_page: filters.per_page,
        };

  const {
    data: tasksResponse,
    isLoading: tasksLoading,
    isFetching: tasksFetching,
  } = useTasks(queryParams);
  const tasksIsPaginated = !!tasksResponse && !Array.isArray(tasksResponse);
  const tasks = tasksIsPaginated ? tasksResponse.items : (tasksResponse ?? []);
  const { data: stats } = useTaskStats();
  const { data: members = [] } = useMembers();
  const createMutation = useCreateTask();
  const updateMutation = useUpdateTask();
  const updateStatusMutation = useUpdateTaskStatus();
  const deleteMutation = useDeleteTask();
  const isTaskFormDirty =
    JSON.stringify(formData) !== JSON.stringify(getTaskFormState(editingTask));
  const { attemptClose: attemptCloseTaskModal, dialog: taskUnsavedDialog } =
    useUnsavedChangesPrompt({
      isDirty: isTaskFormDirty,
      onDiscard: () => {
        setShowAddModal(false);
        resetForm();
      },
      onSave: () => {
        (document.getElementById('task-form') as HTMLFormElement | null)?.requestSubmit();
      },
      isSaving: createMutation.isPending || updateMutation.isPending,
    });
  useModalDismiss(showAddModal, attemptCloseTaskModal);

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingTask(null);
    setCustomReminder(false);
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setFormData(getTaskFormState(task));
    setCustomReminder(!!task.reminder_date);
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against double-fired submit events creating duplicate tasks
    if (createMutation.isPending || updateMutation.isPending) return;
    // A relative reminder without a due date can never fire — drop it rather
    // than persist a dead setting (the select disables these options too).
    const payload =
      !formData.due_date && formData.reminder_offset_days != null
        ? { ...formData, reminder_offset_days: null }
        : formData;
    try {
      if (editingTask) {
        await updateMutation.mutateAsync({ id: editingTask.id, ...payload });
        toast.success('Task updated!');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Task created!');
      }
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      const msg =
        error?.response?.data?.message || error?.response?.data?.error || 'Failed to save task';
      toast.error(msg);
    }
  };

  const cycleStatus = async (task: any) => {
    const newStatus = STATUS_CYCLE[task.status] ?? 'pending';
    try {
      await updateStatusMutation.mutateAsync({ id: task.id, status: newStatus });
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Task deleted!');
      setDeleteConfirm(null);
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;
    const task = tasks.find((t: any) => t.id === active.id);
    const newStatus = String(over.id);
    if (task && task.status !== newStatus) {
      try {
        await updateStatusMutation.mutateAsync({ id: task.id, status: newStatus });
      } catch {
        toast.error('Failed to move task');
      }
    }
  };

  const activeTask = activeId ? tasks.find((t: any) => t.id === activeId) : null;

  if (tasksLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid var(--line-soft)',
            borderTopColor: 'var(--gold)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionHeader
        eyebrow="Checklist"
        title="Tasks & to-dos"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                display: 'flex',
                border: '1px solid var(--line)',
                borderRadius: 8,
                overflow: 'hidden',
              }}
            >
              {[
                { mode: 'list' as const, Icon: HiOutlineViewList, title: 'List view' },
                { mode: 'kanban' as const, Icon: HiOutlineViewGrid, title: 'Kanban view' },
              ].map(({ mode, Icon, title }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={title}
                  style={{
                    padding: '6px 10px',
                    background: viewMode === mode ? 'var(--gold-glow)' : 'transparent',
                    color: viewMode === mode ? 'var(--gold-deep)' : 'var(--ink-dim)',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                >
                  <Icon style={{ width: 15, height: 15 }} />
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
            >
              <HiOutlinePlus style={{ width: 14, height: 14 }} />
              New task
            </button>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <KPICard eyebrow="Total" value={String(stats?.total ?? 0)} />
        <KPICard eyebrow="To do" value={String(stats?.pending ?? 0)} />
        <KPICard eyebrow="In progress" value={String(stats?.in_progress ?? 0)} accent="gold" />
        <KPICard eyebrow="Done" value={String(stats?.completed ?? 0)} accent="green" />
      </div>

      {/* ── KANBAN VIEW ── */}
      {viewMode === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Columns keep a usable min width; narrow screens pan sideways */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(min(240px, 78vw), 1fr))',
              gap: 14,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {COLUMNS.map((col) => {
              const colTasks = tasks.filter((t: any) => t.status === col.status);
              return (
                <DroppableColumn
                  key={col.status}
                  col={col}
                  tasks={colTasks}
                  activeId={activeId}
                  onEdit={handleEdit}
                  onDelete={setDeleteConfirm}
                  onCycleStatus={cycleStatus}
                />
              );
            })}
          </div>

          <DragOverlay>
            {activeTask && (
              <div
                style={{
                  background: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--line)',
                  borderLeft: `3px solid ${PRIORITY_COLOR[activeTask.priority] ?? 'var(--line)'}`,
                  padding: 12,
                  boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                  opacity: 0.95,
                  cursor: 'grabbing',
                  pointerEvents: 'none',
                  width: 240,
                }}
              >
                <p style={{ fontSize: 13, color: 'var(--ink-high)', margin: 0 }}>
                  {activeTask.title}
                </p>
                {activeTask.priority && (
                  <span
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 4,
                      fontWeight: 500,
                      textTransform: 'capitalize',
                      marginTop: 8,
                      display: 'inline-block',
                      ...PRIORITY_PILL_STYLE[activeTask.priority],
                    }}
                  >
                    {activeTask.priority}
                  </span>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <>
          <div className="card" style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input"
              placeholder="Search tasks"
              style={{ maxWidth: 220 }}
            />
            <SegmentedControl
              options={[
                { value: 'all', label: 'All' },
                { value: 'pending', label: 'To do' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'completed', label: 'Done' },
              ]}
              value={statusFilter}
              onChange={setStatusFilter}
            />
            <SegmentedControl
              options={[
                { value: 'all', label: 'All priority' },
                { value: 'urgent', label: 'Urgent' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              value={priorityFilter}
              onChange={setPriorityFilter}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tasks.map((task: any) => (
              <div
                key={task.id}
                style={{
                  background: 'var(--bg-panel)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--line-soft)',
                  borderLeft: `4px solid ${PRIORITY_COLOR[task.priority] ?? 'var(--line)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  opacity: task.status === 'completed' ? 0.6 : 1,
                }}
              >
                <button
                  onClick={() => cycleStatus(task)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    flexShrink: 0,
                    border: `1.5px solid ${task.status === 'completed' ? 'var(--gold)' : task.status === 'in_progress' ? 'var(--gold)' : 'var(--line-strong)'}`,
                    background:
                      task.status === 'completed'
                        ? 'var(--gold)'
                        : task.status === 'in_progress'
                          ? 'var(--gold-glow)'
                          : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  {task.status === 'completed' && (
                    <HiOutlineCheck style={{ width: 10, height: 10, color: 'white' }} />
                  )}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: task.status === 'completed' ? 'var(--ink-dim)' : 'var(--ink-high)',
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {task.title}
                  </p>
                  <div
                    className="mono"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 2,
                      fontSize: 11,
                      color: 'var(--ink-dim)',
                    }}
                  >
                    {task.assigned_to && <span>{task.assigned_to}</span>}
                    {task.assigned_to && task.due_date && <span>·</span>}
                    {task.due_date && <span>{fmtDate(task.due_date)}</span>}
                    <ReminderBell task={task} />
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    padding: '2px 8px',
                    borderRadius: 100,
                    fontWeight: 500,
                    textTransform: 'capitalize',
                    flexShrink: 0,
                    ...PRIORITY_PILL_STYLE[task.priority],
                  }}
                >
                  {task.priority}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    onClick={() => handleEdit(task)}
                    style={{
                      padding: '5px 7px',
                      borderRadius: 6,
                      color: 'var(--ink-dim)',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)';
                    }}
                  >
                    <HiOutlinePencil style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(task.id)}
                    style={{
                      padding: '5px 7px',
                      borderRadius: 6,
                      color: 'var(--ink-dim)',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)';
                      (e.currentTarget as HTMLElement).style.color = 'var(--err)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)';
                    }}
                  >
                    <HiOutlineTrash style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <div
                className="card"
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  fontSize: 13,
                  fontStyle: 'italic',
                  color: 'var(--ink-dim)',
                }}
              >
                {statusFilter !== 'all' || priorityFilter !== 'all' || filters.search.trim()
                  ? 'No tasks match these filters.'
                  : 'No tasks yet — add your first task.'}
              </div>
            )}
          </div>

          {tasksIsPaginated && tasksResponse.total_items > 0 && (
            <Pagination
              page={tasksResponse.page}
              perPage={tasksResponse.per_page}
              totalPages={tasksResponse.total_pages}
              totalItems={tasksResponse.total_items}
              itemCountOnPage={tasks.length}
              itemLabel="tasks"
              onPageChange={setPage}
              isFetching={tasksFetching}
            />
          )}
        </>
      )}

      {/* Add / Edit modal */}
      {showAddModal && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
              padding: 16,
            }}
            onClick={attemptCloseTaskModal}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'var(--bg-panel)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: 560,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  borderBottom: '1px solid var(--line-soft)',
                }}
              >
                <div>
                  <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>
                    Checklist
                  </div>
                  <h2
                    className="display"
                    style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)' }}
                  >
                    {editingTask ? 'Edit task' : 'New task'}
                  </h2>
                </div>
                <button
                  onClick={attemptCloseTaskModal}
                  style={{
                    padding: '6px 8px',
                    borderRadius: 6,
                    color: 'var(--ink-dim)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <HiOutlineX style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <form
                id="task-form"
                onSubmit={handleSubmit}
                style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
              >
                <div>
                  <label className="label">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="input"
                    placeholder="Task title"
                    required
                  />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input"
                    rows={3}
                    placeholder="Task description…"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Due Date</label>
                    <DatePicker
                      value={formData.due_date}
                      onChange={(v) => setFormData({ ...formData, due_date: v })}
                      placeholder="Pick a due date"
                    />
                  </div>
                  <div>
                    <label className="label">Assigned To</label>
                    <input
                      type="text"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="input"
                      placeholder="Person name"
                      list="task-assignee-options"
                    />
                    <datalist id="task-assignee-options">
                      {members.map((m) => (
                        <option key={m.id} value={m.invited_email} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Reminder</label>
                    <select
                      value={
                        customReminder || formData.reminder_date
                          ? 'custom'
                          : formData.reminder_offset_days != null
                            ? String(formData.reminder_offset_days)
                            : ''
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === 'custom') {
                          setCustomReminder(true);
                          setFormData({ ...formData, reminder_offset_days: null });
                          return;
                        }
                        setCustomReminder(false);
                        if (v === '')
                          setFormData({
                            ...formData,
                            reminder_offset_days: null,
                            reminder_date: '',
                            reminder_repeat: 'once',
                          });
                        else
                          setFormData({
                            ...formData,
                            reminder_offset_days: Number(v),
                            reminder_date: '',
                          });
                      }}
                      className="input"
                    >
                      <option value="">None</option>
                      <option value="0" disabled={!formData.due_date}>
                        On due date
                      </option>
                      <option value="1" disabled={!formData.due_date}>
                        1 day before
                      </option>
                      <option value="3" disabled={!formData.due_date}>
                        3 days before
                      </option>
                      <option value="7" disabled={!formData.due_date}>
                        1 week before
                      </option>
                      <option value="14" disabled={!formData.due_date}>
                        2 weeks before
                      </option>
                      <option value="custom">Custom date…</option>
                    </select>
                  </div>
                  {(customReminder || formData.reminder_date) && (
                    <div>
                      <label className="label">Remind on</label>
                      <DatePicker
                        value={formData.reminder_date}
                        onChange={(v) => setFormData({ ...formData, reminder_date: v })}
                        placeholder="Pick a date"
                      />
                    </div>
                  )}
                </div>

                {(formData.reminder_offset_days != null || formData.reminder_date) && (
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: 'var(--ink-mid)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <Checkbox
                      checked={formData.reminder_repeat === 'daily'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reminder_repeat: e.target.checked ? 'daily' : 'once',
                        })
                      }
                    />
                    Keep reminding daily until done
                  </label>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="input"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input"
                    >
                      <option value="pending">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Done</option>
                    </select>
                  </div>
                </div>

                <div
                  style={{ display: 'flex', gap: 10, paddingTop: 4, justifyContent: 'flex-end' }}
                >
                  <button type="button" onClick={attemptCloseTaskModal} className="btn-outline">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="btn-primary"
                    style={{
                      opacity: createMutation.isPending || updateMutation.isPending ? 0.5 : 1,
                    }}
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? 'Saving…'
                      : editingTask
                        ? 'Update task'
                        : 'Create task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
      {taskUnsavedDialog}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteConfirm !== null}
        title="Delete task?"
        message="This action cannot be undone."
        isPending={deleteMutation.isPending}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
