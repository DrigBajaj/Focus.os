import React, { useState } from 'react';
import { Plus, Trash2, Check, Sparkles, Clock, AlertCircle, Play, ChevronDown, ChevronUp, Loader2, FastForward, Pause } from 'lucide-react';
import { TaskItem, Subtask } from '../types';
import { playMechanicalClick, playQuestComplete, playChiptuneBeep } from '../utils/audio';

interface TaskPlannerProps {
  tasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onAddTask: (
    title: string,
    priority: 'urgent' | 'high' | 'normal' | 'low',
    deadline: string,
    estimatedMinutes: number,
    staminaPoints: 1 | 2 | 3,
    category: 'academic' | 'project' | 'life' | 'wellness'
  ) => void;
  onDeleteTask: (id: string) => void;
  onBreakdownTask: (taskId: string) => Promise<void>;
  onStartFocusOnTask: (task: TaskItem) => void;
  onPostponeTask?: (taskId: string) => void;
  onInterruptTask?: (taskId: string, elapsedMinutes?: number, remainingMinutes?: number) => void;
  soundEnabled: boolean;
  isBreakingDownId: string | null;
}

export const TaskPlanner: React.FC<TaskPlannerProps> = ({
  tasks,
  onToggleTask,
  onToggleSubtask,
  onAddTask,
  onDeleteTask,
  onBreakdownTask,
  onStartFocusOnTask,
  onPostponeTask,
  onInterruptTask,
  soundEnabled,
  isBreakingDownId,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('high');
  const [newDeadline, setNewDeadline] = useState('Tomorrow');
  const [newMinutes, setNewMinutes] = useState<number>(30);
  const [newSP, setNewSP] = useState<1 | 2 | 3>(2);
  const [newCategory, setNewCategory] = useState<'academic' | 'project' | 'life' | 'wellness'>('academic');

  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [showDetailsOnMobile, setShowDetailsOnMobile] = useState<boolean>(false);

  const toggleExpand = (taskId: string) => {
    playMechanicalClick(soundEnabled);
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    playMechanicalClick(soundEnabled);
    onAddTask(newTitle.trim(), newPriority, newDeadline, newMinutes, newSP, newCategory);
    setNewTitle('');
    playChiptuneBeep(659, soundEnabled);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'active') return !t.completed;
    if (filter === 'completed') return t.completed;
    return true;
  });

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Quick Task Capture Form (Proposal Section 4.1 & 10) */}
      <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-3 sm:p-5 pixel-shadow">
        <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2 mb-2.5">
          <span className="font-mono text-xs sm:text-sm font-bold uppercase text-[#2D3142]">
            ➕ NEW TASK
          </span>
          <button
            type="button"
            id="planner-toggle-options-btn"
            onClick={() => {
              playMechanicalClick(soundEnabled);
              setShowDetailsOnMobile((prev) => !prev);
            }}
            className="sm:hidden font-mono text-[10px] font-bold text-[#2D3142] px-1.5 py-0.5 bg-[#CADBFB] border border-[#2D3142] rounded-xs"
          >
            {showDetailsOnMobile ? 'LESS ▲' : 'OPTIONS ▾'}
          </button>
        </div>

        <form onSubmit={handleCreateTask} className="space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="planner-new-task-input"
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Finish DBMS assignment or research notes"
              className="flex-1 min-h-[42px] px-3 py-2 bg-[#FAF8F5] border-2 border-[#2D3142] font-sans text-xs sm:text-sm text-[#2D3142] pixel-inset focus:outline-none"
            />
            <button
              type="submit"
              id="planner-add-task-btn"
              className="pixel-btn min-h-[42px] flex items-center justify-center gap-1.5 px-4 py-2 bg-[#7FB685] hover:bg-[#A3CFAB] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>

          {/* Details Row: Visible on desktop always, or when toggled on mobile */}
          <div className={`${showDetailsOnMobile ? 'grid' : 'hidden sm:grid'} grid-cols-2 sm:grid-cols-4 gap-2 pt-1`}>
            {/* Priority */}
            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142] mb-1">
                Priority:
              </label>
              <select
                id="task-priority-select"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full min-h-[38px] px-2 py-1 bg-[#FAF8F5] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-inset-soft"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Deadline */}
            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142] mb-1">
                Deadline:
              </label>
              <input
                id="task-deadline-input"
                type="text"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                placeholder="e.g. Tomorrow 5 PM"
                className="w-full min-h-[38px] px-2 py-1 bg-[#FAF8F5] border-2 border-[#2D3142] font-sans text-xs text-[#2D3142] pixel-inset-soft"
              />
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142] mb-1">
                Duration:
              </label>
              <select
                id="task-duration-select"
                value={newMinutes}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setNewMinutes(m);
                  setNewSP(m <= 15 ? 1 : m <= 40 ? 2 : 3);
                }}
                className="w-full min-h-[38px] px-2 py-1 bg-[#FAF8F5] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-inset-soft"
              >
                <option value={10}>10 mins (1 SP)</option>
                <option value={20}>20 mins (1 SP)</option>
                <option value={30}>30 mins (2 SP)</option>
                <option value={45}>45 mins (2 SP)</option>
                <option value={60}>60 mins (3 SP)</option>
                <option value={90}>90 mins (3 SP)</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block font-mono text-[10px] font-bold text-[#2D3142] mb-1">
                Category:
              </label>
              <select
                id="task-category-select"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="w-full min-h-[38px] px-2 py-1 bg-[#FAF8F5] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-inset-soft"
              >
                <option value="academic">Academic</option>
                <option value="project">Project</option>
                <option value="life">Life / Admin</option>
                <option value="wellness">Wellness</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Task List Matrix */}
      <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-4 sm:p-5 pixel-shadow">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#2D3142] pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs sm:text-sm font-bold text-[#2D3142]">
              Your Tasks ({filteredTasks.length})
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 select-none">
            {(['active', 'completed', 'all'] as const).map((f) => (
              <button
                key={f}
                id={`task-filter-pill-${f}`}
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  setFilter(f);
                }}
                className={`pixel-btn min-h-[32px] px-3 py-1 border-2 border-[#2D3142] font-mono text-[11px] font-bold capitalize rounded-xs ${
                  filter === f
                    ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow-sm'
                    : 'bg-[#F2EFE9] text-[#2D3142]/70'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Task Items */}
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center bg-[#F2EFE9] border-2 border-dashed border-[#2D3142]">
            <p className="font-mono text-xs font-bold text-[#2D3142]">
              NO TASKS MATCH THIS FILTER.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const isExpanded = expandedTasks[task.id] ?? task.subtasks.length > 0;
              const isDecomposing = isBreakingDownId === task.id;
              const completedSubtasks = task.subtasks.filter((s) => s.completed).length;

              return (
                <div
                  key={task.id}
                  className={`border-2 border-[#2D3142] transition-colors ${
                    task.completed
                      ? 'bg-[#E4DFD5]/60 opacity-80'
                      : 'bg-[#F2EFE9] pixel-shadow-sm hover:bg-[#FAF8FF]'
                  }`}
                >
                  {/* Task Card Header Row */}
                  <div className="p-3 sm:p-4">
                    <div className="flex items-start gap-2.5">
                      {/* Checkbox */}
                      <button
                        id={`task-check-${task.id}`}
                        onClick={() => {
                          if (!task.completed) {
                            playQuestComplete(soundEnabled);
                          } else {
                            playMechanicalClick(soundEnabled);
                          }
                          onToggleTask(task.id);
                        }}
                        className="pixel-btn w-5 h-5 sm:w-6 sm:h-6 mt-0.5 border-2 border-[#2D3142] bg-[#FAF8F5] rounded-xs flex items-center justify-center shrink-0 pixel-shadow-sm"
                      >
                        {task.completed && <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#35693F] stroke-[3]" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        {/* Title with full width and natural wrapping */}
                        <h3
                          className={`font-mono text-sm sm:text-base font-bold text-[#2D3142] leading-snug break-words ${
                            task.completed ? 'line-through text-[#2D3142]/60' : ''
                          }`}
                        >
                          {task.title}
                        </h3>

                        {/* Clean Metadata Row */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-sans text-[#2D3142]/80 mt-1.5">
                          {/* Priority Badge */}
                          <span
                            className={`font-mono text-[9px] font-bold px-1.5 py-0.2 border border-[#2D3142] uppercase rounded-2xs ${
                              task.priority === 'urgent'
                                ? 'bg-[#ffdad6] text-[#93000a]'
                                : task.priority === 'high'
                                ? 'bg-[#F4A261] text-[#2D3142]'
                                : 'bg-[#CADBFB] text-[#2D3142]'
                            }`}
                          >
                            {task.priority}
                          </span>

                          <span className="text-[#2D3142]/40" aria-hidden="true">·</span>
                          <span className="capitalize font-mono text-[10px] text-[#2D3142]/90">{task.category}</span>

                          <span className="text-[#2D3142]/40" aria-hidden="true">·</span>
                          <span className="font-mono text-[10px] text-[#2D3142]/80 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#2D3142]/60 shrink-0" />
                            <span>{task.deadline}</span>
                          </span>

                          <span className="text-[#2D3142]/40" aria-hidden="true">·</span>
                          <span className="font-mono text-[10px] text-[#2D3142]/80">
                            {task.remainingMinutes !== undefined
                              ? `~${task.remainingMinutes}m left (${task.estimatedMinutes}m est)`
                              : `~${task.estimatedMinutes}m`}
                          </span>

                          <span className="text-[#2D3142]/40" aria-hidden="true">·</span>
                          <span className="font-mono text-[10px] text-[#2D3142]/80">+{task.staminaPoints} SP</span>

                          {task.status === 'interrupted' && (
                            <>
                              <span className="text-[#2D3142]/40" aria-hidden="true">·</span>
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-[#F8C390] text-[#8E4E14] border border-[#2D3142] rounded-2xs">
                                ⏸ Interrupted
                              </span>
                            </>
                          )}

                          {task.postponeCount && task.postponeCount > 0 ? (
                            <>
                              <span className="text-[#2D3142]/40" aria-hidden="true">·</span>
                              <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 bg-[#E4DFD5] text-[#2D3142]/80 border border-[#2D3142] rounded-2xs">
                                ⏭ Postponed ({task.postponeCount}x)
                              </span>
                            </>
                          ) : null}
                        </div>

                        {/* Notes if any */}
                        {task.notes && (
                          <p className="font-sans text-xs text-[#2D3142]/85 mt-2 bg-[#FAF8F5] border border-[#2D3142]/20 p-2 rounded-xs leading-relaxed break-words">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Dedicated Actions Row: Cleanly separated and easy to tap on phone */}
                    <div className="mt-3 pt-2.5 border-t border-[#2D3142]/15 flex flex-col xs:flex-row xs:items-center justify-between gap-2 select-none">
                      {/* Left: Subtasks indicator & Delete */}
                      <div className="flex items-center justify-between xs:justify-start gap-1.5 sm:gap-2 w-full xs:w-auto">
                        {task.subtasks.length > 0 && (
                          <button
                            id={`expand-subtasks-${task.id}`}
                            onClick={() => toggleExpand(task.id)}
                            className="pixel-btn min-h-[36px] flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[#FAF8F5] hover:bg-[#F2EFE9] border border-[#2D3142] rounded-xs font-mono text-[11px] sm:text-xs font-bold text-[#2D3142]"
                            title="Toggle subtasks checklist"
                          >
                            <span>{completedSubtasks}/{task.subtasks.length} Steps</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        {onPostponeTask && !task.completed && (
                          <button
                            id={`postpone-task-${task.id}`}
                            onClick={() => {
                              playMechanicalClick(soundEnabled);
                              onPostponeTask(task.id);
                            }}
                            title="Postpone this task (deprioritizes in adaptive schedule)"
                            className="pixel-btn min-h-[36px] px-2 py-1 bg-[#FAF8F5] hover:bg-[#F8C390] text-[#2D3142] rounded-xs border border-[#2D3142]/40 font-mono text-[11px] font-bold flex items-center gap-1"
                          >
                            <FastForward className="w-3.5 h-3.5 text-[#E07A5F]" />
                            <span className="hidden sm:inline">Postpone</span>
                          </button>
                        )}

                        <button
                          id={`delete-task-${task.id}`}
                          onClick={() => {
                            playMechanicalClick(soundEnabled);
                            onDeleteTask(task.id);
                          }}
                          title="Delete task"
                          className="pixel-btn min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 text-[#2D3142]/60 hover:text-[#BA1A1A] hover:bg-[#FAF8F5] rounded-xs border border-transparent hover:border-[#2D3142] ml-auto xs:ml-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Right: AI Breakdown & Focus Actions */}
                      <div className="flex items-center gap-1.5 w-full xs:w-auto justify-end">
                        {!task.completed && (
                          <button
                            id={`breakdown-task-${task.id}`}
                            onClick={() => {
                              playMechanicalClick(soundEnabled);
                              onBreakdownTask(task.id);
                            }}
                            disabled={isDecomposing}
                            title="Decompose into small actionable micro-steps"
                            className="pixel-btn flex-1 xs:flex-initial justify-center min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#CADBFB] border border-[#2D3142] rounded-xs font-mono text-[11px] sm:text-xs font-bold text-[#2D3142] flex items-center gap-1.5 whitespace-nowrap"
                          >
                            {isDecomposing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7FB685]" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-[#F4A261]" />
                            )}
                            <span>{task.subtasks.length > 0 ? 'Re-Break' : 'Break Down'}</span>
                          </button>
                        )}

                        {!task.completed && (
                          <button
                            id={`start-focus-task-${task.id}`}
                            onClick={() => {
                              playMechanicalClick(soundEnabled);
                              onStartFocusOnTask(task);
                            }}
                            title="Start Focus Quest on this task"
                            className="pixel-btn flex-1 xs:flex-initial justify-center min-h-[36px] sm:min-h-[38px] px-3 sm:px-3.5 py-1.5 bg-[#7FB685] hover:bg-[#A3CFAB] border-2 border-[#2D3142] rounded-xs font-mono text-[11px] sm:text-xs font-bold text-[#2D3142] flex items-center gap-1.5 pixel-shadow-sm whitespace-nowrap"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Quest</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Subtasks Accordion Panel (Full-Row Tap Targets) */}
                  {isExpanded && task.subtasks.length > 0 && (
                    <div className="border-t-2 border-[#2D3142] bg-[#FAF8F5] p-3 space-y-2">
                      <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#2D3142]/80 mb-1">
                        <span>Actionable Steps ({completedSubtasks}/{task.subtasks.length} done):</span>
                        <span className="text-[10px] text-[#2D3142]/60 font-sans">Tap row to check</span>
                      </div>

                      {task.subtasks.map((sub) => (
                        <div
                          key={sub.id}
                          id={`subtask-row-${sub.id}`}
                          onClick={() => {
                            if (!sub.completed) playQuestComplete(soundEnabled);
                            else playMechanicalClick(soundEnabled);
                            onToggleSubtask(task.id, sub.id);
                          }}
                          className={`cursor-pointer min-h-[44px] flex items-center justify-between gap-2.5 p-2.5 border border-[#2D3142] rounded-xs transition-colors select-none ${
                            sub.completed ? 'bg-[#E4DFD5]/50 text-[#2D3142]/60' : 'bg-[#FAF8F5] hover:bg-[#CADBFB]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-xs border-2 border-[#2D3142] flex items-center justify-center shrink-0 ${
                                sub.completed ? 'bg-[#7FB685] text-[#2D3142]' : 'bg-[#FAF8F5]'
                              }`}
                            >
                              {sub.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span
                              className={`font-sans text-xs text-[#2D3142] leading-snug break-words ${
                                sub.completed ? 'line-through text-[#2D3142]/60' : 'font-medium'
                              }`}
                            >
                              {sub.title}
                            </span>
                          </div>

                          <span className="font-mono text-[10px] text-[#2D3142]/70 shrink-0">
                            ~{sub.estimatedMinutes}m · {sub.staminaPoints} SP
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
