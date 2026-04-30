/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
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
} from 'react-icons/hi';
import { SectionHeader, KPICard, SegmentedControl } from '../../components/ui';
import DatePicker from '../../components/ui/DatePicker';
import useUnsavedChangesPrompt from '../../hooks/useUnsavedChangesPrompt';

interface TaskFormData {
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
  assigned_to: string;
  event_id: string | null;
}

const DEFAULT_FORM: TaskFormData = {
  title: '',
  description: '',
  due_date: '',
  priority: 'medium',
  status: 'pending',
  assigned_to: '',
  event_id: null,
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
  };
}

const PRIORITY_COLOR: Record<string, string> = {
  urgent: '#dc2626',
  high: '#ea580c',
  medium: 'var(--gold)',
  low: 'var(--line-strong)',
};

const PRIORITY_PILL_STYLE: Record<string, React.CSSProperties> = {
  urgent: { background: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' },
  high:   { background: 'rgba(234,88,12,0.08)',  color: '#ea580c', border: '1px solid rgba(234,88,12,0.2)' },
  medium: { background: 'var(--gold-glow)',       color: 'var(--gold-deep)', border: '1px solid rgba(212,175,55,0.3)' },
  low:    { background: 'var(--bg-raised)',       color: 'var(--ink-low)',   border: '1px solid var(--line)' },
};

const COLUMNS = [
  { status: 'pending',     label: 'To do',       dotColor: 'var(--line-strong)' },
  { status: 'in_progress', label: 'In progress',  dotColor: 'var(--gold)' },
  { status: 'completed',   label: 'Done',         dotColor: '#16a34a' },
];

const STATUS_CYCLE: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'completed',
  completed: 'pending',
};

function fmtDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
          onClick={(e) => { e.stopPropagation(); onCycleStatus(task); }}
          style={{
            width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
            border: `1.5px solid ${task.status === 'completed' ? 'var(--gold)' : task.status === 'in_progress' ? 'var(--gold)' : 'var(--line-strong)'}`,
            background: task.status === 'completed' ? 'var(--gold)' : task.status === 'in_progress' ? 'var(--gold-glow)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}
        >
          {task.status === 'completed' && <HiOutlineCheck style={{ width: 10, height: 10, color: 'white' }} />}
        </button>
        <p style={{ fontSize: 13, flex: 1, lineHeight: 1.4, color: task.status === 'completed' ? 'var(--ink-dim)' : 'var(--ink-high)', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
          {task.title}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24 }}>
        <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 500, textTransform: 'capitalize', ...PRIORITY_PILL_STYLE[task.priority] }}>
          {task.priority}
        </span>
        {task.due_date && (
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-dim)' }}>{fmtDate(task.due_date)}</span>
        )}
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
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          style={{ padding: '3px 5px', borderRadius: 4, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)'; (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)'; }}
        >
          <HiOutlinePencil style={{ width: 12, height: 12 }} />
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          style={{ padding: '3px 5px', borderRadius: 4, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--err)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)'; }}
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
  col: typeof COLUMNS[number];
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
        background: isOver ? 'rgba(212,175,55,0.06)' : 'var(--bg-raised)',
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
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dotColor, flexShrink: 0 }} />
        <span className="uppercase-eyebrow" style={{ flex: 1, fontSize: 9 }}>{col.label}</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-dim)' }}>{tasks.length}</span>
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
        <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, fontStyle: 'italic', color: 'var(--ink-dim)' }}>
          Drop tasks here
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Tasks() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<TaskFormData>(DEFAULT_FORM);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const queryParams =
    viewMode === 'kanban'
      ? {}
      : {
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
        };

  const { data: tasks = [], isLoading: tasksLoading } = useTasks(queryParams);
  const { data: stats } = useTaskStats();
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

  const resetForm = () => {
    setFormData(DEFAULT_FORM);
    setEditingTask(null);
  };

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setFormData(getTaskFormState(task));
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await updateMutation.mutateAsync({ id: editingTask.id, ...formData });
        toast.success('Task updated!');
      } else {
        await createMutation.mutateAsync(formData);
        toast.success('Task created!');
      }
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      const msg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to save task';
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
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--line-soft)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite' }} />
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
            <div style={{ display: 'flex', border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
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
                <p style={{ fontSize: 13, color: 'var(--ink-high)', margin: 0 }}>{activeTask.title}</p>
                {activeTask.priority && (
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 500, textTransform: 'capitalize', marginTop: 8, display: 'inline-block', ...PRIORITY_PILL_STYLE[activeTask.priority] }}>
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
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${task.status === 'completed' ? 'var(--gold)' : task.status === 'in_progress' ? 'var(--gold)' : 'var(--line-strong)'}`,
                    background: task.status === 'completed' ? 'var(--gold)' : task.status === 'in_progress' ? 'var(--gold-glow)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                  }}
                >
                  {task.status === 'completed' && <HiOutlineCheck style={{ width: 10, height: 10, color: 'white' }} />}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: task.status === 'completed' ? 'var(--ink-dim)' : 'var(--ink-high)', textDecoration: task.status === 'completed' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </p>
                  <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, fontSize: 11, color: 'var(--ink-dim)' }}>
                    {task.assigned_to && <span>{task.assigned_to}</span>}
                    {task.assigned_to && task.due_date && <span>·</span>}
                    {task.due_date && <span>{fmtDate(task.due_date)}</span>}
                  </div>
                </div>

                <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 100, fontWeight: 500, textTransform: 'capitalize', flexShrink: 0, ...PRIORITY_PILL_STYLE[task.priority] }}>
                  {task.priority}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <button
                    onClick={() => handleEdit(task)}
                    style={{ padding: '5px 7px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--gold-glow)'; (e.currentTarget as HTMLElement).style.color = 'var(--gold-deep)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)'; }}
                  >
                    <HiOutlinePencil style={{ width: 14, height: 14 }} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(task.id)}
                    style={{ padding: '5px 7px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(220,38,38,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--err)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--ink-dim)'; }}
                  >
                    <HiOutlineTrash style={{ width: 14, height: 14 }} />
                  </button>
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '40px 0', fontSize: 13, fontStyle: 'italic', color: 'var(--ink-dim)' }}>
                No tasks found
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit modal */}
      {showAddModal && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={attemptCloseTaskModal}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--line-soft)' }}>
                <div>
                  <div className="uppercase-eyebrow" style={{ marginBottom: 4 }}>Checklist</div>
                  <h2 className="display" style={{ margin: 0, fontSize: 22, color: 'var(--ink-high)' }}>{editingTask ? 'Edit task' : 'New task'}</h2>
                </div>
                <button onClick={attemptCloseTaskModal} style={{ padding: '6px 8px', borderRadius: 6, color: 'var(--ink-dim)', background: 'transparent', cursor: 'pointer' }}>
                  <HiOutlineX style={{ width: 16, height: 16 }} />
                </button>
              </div>

              <form id="task-form" onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="label">Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="input" placeholder="Task title" required />
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input" rows={3} placeholder="Task description…" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Due Date</label>
                    <DatePicker value={formData.due_date} onChange={(v) => setFormData({ ...formData, due_date: v })} placeholder="Pick a due date" />
                  </div>
                  <div>
                    <label className="label">Assigned To</label>
                    <input type="text" value={formData.assigned_to} onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })} className="input" placeholder="Person name" />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="label">Priority</label>
                    <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="input">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="input">
                      <option value="pending">To do</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Done</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                  <button type="button" onClick={attemptCloseTaskModal} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary" style={{ flex: 1, opacity: createMutation.isPending || updateMutation.isPending ? 0.5 : 1 }}>
                    {createMutation.isPending || updateMutation.isPending ? 'Saving…' : editingTask ? 'Update task' : 'Create task'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
      {taskUnsavedDialog}

      {/* Delete confirm */}
      {deleteConfirm && (
        <Portal>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setDeleteConfirm(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-panel)', borderRadius: 'var(--radius-lg)', padding: 28, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
              <h3 className="display" style={{ margin: '0 0 8px', fontSize: 20, color: 'var(--ink-high)' }}>Delete task?</h3>
              <p style={{ fontSize: 13, color: 'var(--ink-low)', marginBottom: 24 }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDeleteConfirm(null)} className="btn-outline" style={{ flex: 1 }}>Cancel</button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleteMutation.isPending}
                  style={{ flex: 1, padding: '9px 16px', background: 'var(--err)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', opacity: deleteMutation.isPending ? 0.5 : 1 }}
                >
                  {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
