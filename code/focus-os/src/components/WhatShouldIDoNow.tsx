import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Clock,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Pause,
  FastForward,
  RotateCcw,
  RefreshCw,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { TaskItem, ScheduleChangeEvent } from '../types';
import { playMechanicalClick, playChiptuneBeep, playQuestComplete } from '../utils/audio';
import {
  calculateAdaptiveSchedule,
  createScheduleEvent,
} from '../utils/adaptiveScheduler';

interface WhatShouldIDoNowProps {
  tasks: TaskItem[];
  onStartFocusOnTask: (task: TaskItem) => void;
  onBreakdownTask: (taskId: string) => void;
  onPostponeTask?: (taskId: string) => void;
  onInterruptTask?: (taskId: string, elapsedMinutes?: number, remainingMinutes?: number) => void;
  onCompleteTask?: (taskId: string) => void;
  availableMinutes?: number;
  onUpdateAvailableMinutes?: (minutes: number) => void;
  lastScheduleEvent?: ScheduleChangeEvent | null;
  soundEnabled: boolean;
}

export const WhatShouldIDoNow: React.FC<WhatShouldIDoNowProps> = ({
  tasks,
  onStartFocusOnTask,
  onBreakdownTask,
  onPostponeTask,
  onInterruptTask,
  onCompleteTask,
  availableMinutes: externalAvailableMinutes,
  onUpdateAvailableMinutes,
  lastScheduleEvent: externalLastScheduleEvent,
  soundEnabled,
}) => {
  // Local available window state if external prop not passed
  const [internalMinutes, setInternalMinutes] = useState<number>(30);
  const availableMinutes = externalAvailableMinutes ?? internalMinutes;

  const [energyLevel, setEnergyLevel] = useState<'low' | 'med' | 'high'>('med');
  const [showCustomTime, setShowCustomTime] = useState<boolean>(false);
  const [customTimeInput, setCustomTimeInput] = useState<string>(String(availableMinutes));
  const [showAllRanked, setShowAllRanked] = useState<boolean>(false);

  // Interruption modal / popover state
  const [interruptingTaskId, setInterruptingTaskId] = useState<string | null>(null);
  const [remainingMinutesInput, setRemainingMinutesInput] = useState<number>(15);

  // Recalculation toast / flash animation tracking
  const [recalcBanner, setRecalcBanner] = useState<{ message: string; timestamp: number } | null>(null);
  const previousTopTaskIdRef = useRef<string | null>(null);

  // Internal schedule event tracker if external not supplied
  const [localEvent, setLocalEvent] = useState<ScheduleChangeEvent | null>(null);
  const activeEvent = externalLastScheduleEvent || localEvent;

  // Run the Adaptive Scheduling Engine
  const scheduleResult = calculateAdaptiveSchedule(tasks, {
    availableMinutes,
    energyLevel,
    lastEvent: activeEvent,
    previousTopTaskId: previousTopTaskIdRef.current,
  });

  const bestMatch = scheduleResult.recommendedTask;
  const alternativeMatches = scheduleResult.rankedTasks.slice(1, showAllRanked ? undefined : 3);
  const remainingAlternativesCount = Math.max(0, scheduleResult.rankedTasks.length - 3);

  // Track changes to show visible recalculation banner
  useEffect(() => {
    if (activeEvent) {
      setRecalcBanner({
        message: scheduleResult.recalculationReason,
        timestamp: Date.now(),
      });
    }
  }, [activeEvent, scheduleResult.recalculationReason]);

  // Keep track of top recommended task id
  useEffect(() => {
    if (bestMatch) {
      previousTopTaskIdRef.current = bestMatch.task.id;
    }
  }, [bestMatch]);

  // Update available minutes
  const handleSetAvailableMinutes = (mins: number) => {
    const valid = Math.max(5, Math.min(240, mins));
    playMechanicalClick(soundEnabled);
    if (onUpdateAvailableMinutes) {
      onUpdateAvailableMinutes(valid);
    } else {
      setInternalMinutes(valid);
      setLocalEvent(
        createScheduleEvent('time_changed', `Available time changed to ${valid}m`, {
          previousMinutes: availableMinutes,
          newMinutes: valid,
        })
      );
    }
    setCustomTimeInput(String(valid));
  };

  // Quick Postpone handler
  const handlePostpone = (taskId: string, title: string) => {
    playMechanicalClick(soundEnabled);
    if (onPostponeTask) {
      onPostponeTask(taskId);
    } else {
      setLocalEvent(
        createScheduleEvent('task_postponed', `Task "${title}" was postponed`, {
          taskId,
          taskTitle: title,
        })
      );
    }
  };

  // Open Interruption dialog
  const handleOpenInterrupt = (task: TaskItem) => {
    playMechanicalClick(soundEnabled);
    const initialRemaining = Math.max(
      5,
      task.remainingMinutes ?? Math.round(task.estimatedMinutes / 2)
    );
    setInterruptingTaskId(task.id);
    setRemainingMinutesInput(initialRemaining);
  };

  // Confirm Interruption
  const handleConfirmInterrupt = (taskId: string, title: string) => {
    playMechanicalClick(soundEnabled);
    const remaining = Math.max(1, remainingMinutesInput);
    if (onInterruptTask) {
      onInterruptTask(taskId, undefined, remaining);
    } else {
      setLocalEvent(
        createScheduleEvent(
          'task_interrupted',
          `Task "${title}" interrupted (${remaining}m remaining work)`,
          { taskId, taskTitle: title, newMinutes: remaining }
        )
      );
    }
    setInterruptingTaskId(null);
  };

  return (
    <div className="w-full space-y-3 sm:space-y-4">
      {/* Context Assessment Form (Available Time & Energy) */}
      <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-3.5 sm:p-5 pixel-shadow space-y-3">
        <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#7FB685]" />
            <span className="font-mono text-xs sm:text-sm font-bold text-[#2D3142]">
              What Should I Do Now?
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] px-2 py-0.5 bg-[#CADBFB] border border-[#2D3142] text-[#2D3142] rounded-xs font-bold">
              Adaptive Scheduling
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Time Budget */}
          <div>
            <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#2D3142] mb-1.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2D3142]/70" />
                <span>Available Window:</span>
              </span>
              <div className="flex items-center gap-1">
                <span className="px-1.5 bg-[#F4A261] border border-[#2D3142] text-[#2D3142] text-[10px] font-mono font-bold">
                  {availableMinutes}m
                </span>
                <button
                  type="button"
                  id="toggle-custom-window-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    setShowCustomTime(!showCustomTime);
                  }}
                  className="font-mono text-[9px] text-[#2D3142]/80 hover:text-[#2D3142] underline ml-1"
                >
                  {showCustomTime ? 'Presets' : 'Custom'}
                </button>
              </div>
            </div>

            {!showCustomTime ? (
              <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                {[15, 25, 40, 60].map((mins) => (
                  <button
                    key={mins}
                    id={`avail-time-btn-${mins}`}
                    onClick={() => handleSetAvailableMinutes(mins)}
                    className={`pixel-btn min-h-[40px] py-1 px-1 border border-[#2D3142] font-mono text-[11px] sm:text-xs font-bold rounded-xs transition-colors text-center ${
                      availableMinutes === mins
                        ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow-sm font-black'
                        : 'bg-[#F2EFE9] text-[#2D3142]/70 hover:bg-[#FAF8F5]'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSetAvailableMinutes(Math.max(5, availableMinutes - 5))}
                  className="pixel-btn min-h-[38px] min-w-[38px] flex items-center justify-center bg-[#F2EFE9] border border-[#2D3142] font-mono font-bold text-[#2D3142] rounded-xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    value={customTimeInput}
                    onChange={(e) => {
                      setCustomTimeInput(e.target.value);
                      const parsed = parseInt(e.target.value, 10);
                      if (!isNaN(parsed) && parsed > 0) {
                        handleSetAvailableMinutes(parsed);
                      }
                    }}
                    className="w-full min-h-[38px] px-2 py-1 bg-[#FAF8F5] border-2 border-[#2D3142] font-mono text-center text-xs font-bold text-[#2D3142] pixel-inset-soft"
                  />
                  <span className="absolute right-2 top-2 font-mono text-[10px] text-[#2D3142]/60 pointer-events-none">
                    mins
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSetAvailableMinutes(Math.min(240, availableMinutes + 5))}
                  className="pixel-btn min-h-[38px] min-w-[38px] flex items-center justify-center bg-[#F2EFE9] border border-[#2D3142] font-mono font-bold text-[#2D3142] rounded-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Energy Level */}
          <div>
            <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#2D3142] mb-1.5">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-[#2D3142]/70" />
                <span>Current Energy:</span>
              </span>
              <span className="capitalize px-1.5 bg-[#CADBFB] border border-[#2D3142] text-[#2D3142] text-[10px] font-mono">
                {energyLevel}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'low' as const, label: 'Low' },
                { id: 'med' as const, label: 'Medium' },
                { id: 'high' as const, label: 'High' },
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  id={`energy-lvl-btn-${lvl.id}`}
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    setEnergyLevel(lvl.id);
                  }}
                  className={`pixel-btn min-h-[42px] py-1.5 border border-[#2D3142] font-mono text-xs font-bold rounded-xs transition-colors ${
                    energyLevel === lvl.id
                      ? 'bg-[#F8C390] text-[#2D3142] pixel-shadow-sm font-black'
                      : 'bg-[#F2EFE9] text-[#2D3142]/70 hover:bg-[#FAF8F5]'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Recalculation Notice Banner */}
        {recalcBanner && (
          <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-2 sm:p-2.5 rounded-xs flex items-center justify-between gap-2 text-xs pixel-inset-soft">
            <div className="flex items-center gap-2 min-w-0">
              <RefreshCw className="w-3.5 h-3.5 text-[#35693F] shrink-0 animate-spin-once" />
              <div className="font-mono text-[11px] font-bold text-[#2D3142] truncate">
                {recalcBanner.message}
              </div>
            </div>
            <span className="font-mono text-[9px] text-[#2D3142]/60 shrink-0">
              Auto-Adjusted
            </span>
          </div>
        )}
      </div>

      {/* Recommended Task Showcase Card */}
      {bestMatch ? (
        <div className="bg-[#CADBFB] border-2 border-[#2D3142] p-3.5 sm:p-5 pixel-shadow relative overflow-hidden rounded-xs space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2">
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span className="font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#7FB685] border border-[#2D3142] text-[#2D3142] rounded-xs shrink-0">
                ⭐ Recommended Next Step
              </span>
              {bestMatch.task.status === 'interrupted' && (
                <span className="font-mono text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 bg-[#F8C390] border border-[#2D3142] text-[#8E4E14] rounded-xs shrink-0 flex items-center gap-1">
                  <Pause className="w-2.5 h-2.5" />
                  Interrupted · {bestMatch.effectiveRemainingMinutes}m left
                </span>
              )}
              {bestMatch.isOverdue && (
                <span className="font-mono text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 bg-[#F4A261] border border-[#2D3142] text-[#BA1A1A] rounded-xs shrink-0">
                  ⚠️ Overdue
                </span>
              )}
              {bestMatch.task.postponeCount && bestMatch.task.postponeCount > 0 ? (
                <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#E4DFD5] border border-[#2D3142] text-[#2D3142]/80 rounded-xs shrink-0">
                  Postponed ({bestMatch.task.postponeCount}x)
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#FAF8F5] border border-[#2D3142] text-[#2D3142] rounded-xs">
                Score {Math.round(bestMatch.score)}
              </span>
            </div>
          </div>

          {/* Task Title & Details */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-mono text-base sm:text-xl font-bold text-[#2D3142] leading-snug break-words">
                {bestMatch.task.title}
              </h2>
              <span className="font-mono text-[11px] sm:text-xs font-bold text-[#2D3142]/80 shrink-0 bg-[#FAF8F5]/80 px-2 py-0.5 rounded-xs border border-[#2D3142]/20">
                ~{bestMatch.effectiveRemainingMinutes}m remaining · +{bestMatch.task.staminaPoints} SP
              </span>
            </div>

            {bestMatch.task.notes && (
              <p className="font-sans text-xs text-[#2D3142]/85 bg-[#FAF8F5]/80 p-2.5 rounded-xs border border-[#2D3142]/15 leading-relaxed break-words">
                {bestMatch.task.notes}
              </p>
            )}
          </div>

          {/* Transparent Reasoning Section */}
          <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-3 pixel-inset-soft rounded-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#2D3142]">
                <Lightbulb className="w-3.5 h-3.5 text-[#F4A261] shrink-0" />
                <span>Why this task is recommended right now</span>
              </div>
              {bestMatch.rankChangeNote && (
                <span className="font-mono text-[9px] font-bold text-[#35693F] bg-[#CADBFB] px-1.5 py-0.2 border border-[#2D3142] rounded-xs">
                  {bestMatch.rankChangeNote}
                </span>
              )}
            </div>

            {/* Primary High-Level Summary Explanation */}
            <div className="bg-[#CADBFB]/40 p-2 border border-[#2D3142]/20 rounded-xs">
              <p className="font-sans text-xs font-medium text-[#2D3142] leading-snug">
                "{bestMatch.primaryExplanation}"
              </p>
            </div>

            {/* Granular Factors Checklist */}
            <ul className="space-y-1 text-xs pt-1">
              {bestMatch.reasons.map((r, i) => (
                <li key={i} className="font-sans text-[11px] sm:text-xs text-[#2D3142] flex items-start gap-1.5 leading-snug">
                  <span className="text-[#35693F] font-bold shrink-0 mt-0.5">✓</span>
                  <span className="break-words">{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Subtasks if any */}
          {bestMatch.task.subtasks.length > 0 && (
            <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-3 rounded-xs space-y-1.5">
              <div className="font-mono text-[11px] font-bold text-[#2D3142] mb-1">
                Subtasks ({bestMatch.task.subtasks.filter((s) => s.completed).length}/{bestMatch.task.subtasks.length} done):
              </div>
              <div className="space-y-1.5">
                {bestMatch.task.subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-start gap-2 font-sans text-xs text-[#2D3142]">
                    <span className="font-mono text-[11px] text-[#7FB685] font-bold shrink-0 mt-0.5">
                      {sub.completed ? '☑' : '☐'}
                    </span>
                    <span className={`break-words leading-snug ${sub.completed ? 'line-through opacity-60' : ''}`}>
                      {sub.title} <span className="font-mono text-[10px] text-[#2D3142]/70">({sub.estimatedMinutes}m)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Row: Primary Quest + Rescheduling Controls */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Primary: Start Quest */}
              <button
                id="start-recommended-focus-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  playChiptuneBeep(659, soundEnabled);
                  onStartFocusOnTask(bestMatch.task);
                }}
                className="pixel-btn min-h-[46px] sm:min-h-[48px] flex-1 flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-[#7FB685] hover:bg-[#A3CFAB] border-2 border-[#2D3142] font-mono text-xs sm:text-sm font-bold text-[#2D3142] pixel-shadow rounded-xs text-center"
              >
                <span className="truncate">🎮 Start Focus Quest (~{bestMatch.effectiveRemainingMinutes}m)</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              {/* Complete Task directly */}
              {onCompleteTask && (
                <button
                  id="complete-recommended-task-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    playQuestComplete(soundEnabled);
                    onCompleteTask(bestMatch.task.id);
                  }}
                  title="Mark this task as completed"
                  className="pixel-btn min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FAF8F5] hover:bg-[#CADBFB] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-shadow-sm rounded-xs whitespace-nowrap"
                >
                  <Check className="w-4 h-4 text-[#35693F]" />
                  <span>Done</span>
                </button>
              )}

              {/* AI Breakdown if no subtasks */}
              {bestMatch.task.subtasks.length === 0 && (
                <button
                  id="breakdown-recommended-task-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    onBreakdownTask(bestMatch.task.id);
                  }}
                  className="pixel-btn min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FAF8F5] hover:bg-[#F2EFE9] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-shadow-sm rounded-xs whitespace-nowrap shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-[#F4A261] shrink-0" />
                  <span>Break Down</span>
                </button>
              )}
            </div>

            {/* Adaptive Rescheduling Adjusters: Postpone & Interrupt Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#2D3142]/20">
              <span className="font-mono text-[10px] font-bold text-[#2D3142]/70 uppercase">
                Adapt Schedule:
              </span>

              {/* Postpone Button */}
              <button
                type="button"
                id="postpone-recommended-btn"
                onClick={() => handlePostpone(bestMatch.task.id, bestMatch.task.title)}
                className="pixel-btn min-h-[34px] px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#F8C390] border border-[#2D3142] font-mono text-[11px] font-bold text-[#2D3142] rounded-xs flex items-center gap-1.5"
                title="Postpone this task and recalculate next best choice"
              >
                <FastForward className="w-3 h-3 text-[#E07A5F]" />
                <span>Postpone</span>
              </button>

              {/* Interrupt / Set Remaining Button */}
              <button
                type="button"
                id="interrupt-recommended-btn"
                onClick={() => handleOpenInterrupt(bestMatch.task)}
                className="pixel-btn min-h-[34px] px-2.5 py-1 bg-[#FAF8F5] hover:bg-[#CADBFB] border border-[#2D3142] font-mono text-[11px] font-bold text-[#2D3142] rounded-xs flex items-center gap-1.5"
                title="Record remaining work or mark interrupted"
              >
                <Pause className="w-3 h-3 text-[#2D3142]" />
                <span>Interrupt / Remaining</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#FAF8F5] border-2 border-dashed border-[#2D3142] p-8 text-center rounded-xs space-y-2">
          <p className="font-mono text-sm font-bold text-[#2D3142]">
            All active tasks are complete!
          </p>
          <p className="font-sans text-xs text-[#2D3142]/70 max-w-md mx-auto">
            Your schedule has been cleared. Enjoy a well-deserved sensory break or add new goals in the Task Planner.
          </p>
        </div>
      )}

      {/* Interruption / Remaining Duration Modal */}
      {interruptingTaskId && (
        <div className="fixed inset-0 z-50 bg-[#2D3142]/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-200">
          <div className="bg-[#FAF8F5] border-3 border-[#2D3142] w-full max-w-sm p-4 sm:p-5 pixel-shadow-lg rounded-xs space-y-3">
            <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2">
              <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#2D3142]">
                <Pause className="w-4 h-4 text-[#8E4E14]" />
                <span>Record Interrupted Progress</span>
              </div>
              <button
                onClick={() => setInterruptingTaskId(null)}
                className="font-mono text-xs font-bold text-[#2D3142] p-1"
              >
                ✕
              </button>
            </div>

            <p className="font-sans text-xs text-[#2D3142]/80 leading-relaxed">
              Got interrupted? Enter the remaining minutes of work left so the adaptive engine can preserve your progress and recalculate recommendations.
            </p>

            <div className="bg-[#F2EFE9] p-3 border border-[#2D3142] rounded-xs space-y-2">
              <label className="block font-mono text-[11px] font-bold text-[#2D3142]">
                Estimated Minutes Remaining:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={240}
                  value={remainingMinutesInput}
                  onChange={(e) => setRemainingMinutesInput(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 min-h-[38px] px-2 py-1 bg-[#FAF8F5] border-2 border-[#2D3142] font-mono text-center text-sm font-bold text-[#2D3142] pixel-inset"
                />
                <span className="font-mono text-xs font-bold text-[#2D3142]/70">minutes left</span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex gap-1.5 pt-1">
                {[10, 15, 20, 30].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setRemainingMinutesInput(mins)}
                    className="pixel-btn px-2 py-0.5 bg-[#FAF8F5] border border-[#2D3142] font-mono text-[10px] text-[#2D3142] rounded-xs"
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setInterruptingTaskId(null)}
                className="pixel-btn min-h-[40px] flex-1 py-1.5 bg-[#E4DFD5] border border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] rounded-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetTask = tasks.find((t) => t.id === interruptingTaskId);
                  if (targetTask) {
                    handleConfirmInterrupt(targetTask.id, targetTask.title);
                  }
                }}
                className="pixel-btn min-h-[40px] flex-1 py-1.5 bg-[#7FB685] hover:bg-[#A3CFAB] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] pixel-shadow-sm rounded-xs"
              >
                Save & Recalculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Ranked Recommendations */}
      {alternativeMatches.length > 0 && (
        <div className="bg-[#F2EFE9] border-2 border-[#2D3142] p-3.5 sm:p-4 pixel-shadow rounded-xs space-y-2">
          <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#2D3142]">
                Ranked Alternatives
              </span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 bg-[#CADBFB] border border-[#2D3142] rounded-xs font-bold">
                {scheduleResult.rankedTasks.length - 1} options
              </span>
            </div>
            <span className="font-sans text-[11px] text-[#2D3142]/70 hidden sm:inline">
              Prefer another task? Manual overrides remain fully supported:
            </span>
          </div>

          <div className="space-y-2">
            {alternativeMatches.map(({ task, score, effectiveRemainingMinutes, primaryExplanation, fitsTimeBudget }, idx) => (
              <div
                key={task.id}
                className="bg-[#FAF8F5] border-2 border-[#2D3142] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pixel-shadow-sm rounded-xs"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-[#2D3142] text-[#FAF8F5] rounded-xs">
                      #{idx + 2}
                    </span>
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#2D3142] leading-snug break-words">
                      {task.title}
                    </span>
                    {task.status === 'interrupted' && (
                      <span className="font-mono text-[9px] font-bold px-1 bg-[#F8C390] border border-[#2D3142] text-[#8E4E14] rounded-xs">
                        Interrupted
                      </span>
                    )}
                    {task.postponeCount && task.postponeCount > 0 ? (
                      <span className="font-mono text-[9px] px-1 bg-[#E4DFD5] border border-[#2D3142] text-[#2D3142]/70 rounded-xs">
                        Postponed ({task.postponeCount}x)
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-sans text-[#2D3142]/75">
                    <span className="font-mono text-[9px] font-bold uppercase px-1 border border-[#2D3142] bg-[#CADBFB]">
                      {task.priority}
                    </span>
                    <span>·</span>
                    <span className="font-mono text-[10px]">~{effectiveRemainingMinutes}m</span>
                    <span>·</span>
                    <span className="font-mono text-[10px] px-1 bg-[#FAF8F5] border border-[#2D3142]/30">
                      Score {Math.round(score)}
                    </span>
                    <span>·</span>
                    <span className={`text-[10px] font-sans ${fitsTimeBudget ? 'text-[#35693F]' : 'text-[#8E4E14]'}`}>
                      {primaryExplanation}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-stretch sm:self-center shrink-0">
                  {/* Postpone alternative button */}
                  <button
                    type="button"
                    onClick={() => handlePostpone(task.id, task.title)}
                    title="Postpone this task"
                    className="pixel-btn min-h-[38px] px-2 py-1 bg-[#FAF8F5] hover:bg-[#F8C390] border border-[#2D3142] font-mono text-[11px] text-[#2D3142] rounded-xs"
                  >
                    <FastForward className="w-3 h-3" />
                  </button>

                  {/* Manual Focus Override button */}
                  <button
                    id={`select-alt-task-${task.id}`}
                    onClick={() => {
                      playMechanicalClick(soundEnabled);
                      onStartFocusOnTask(task);
                    }}
                    className="pixel-btn min-h-[38px] flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#CADBFB] hover:bg-[#B4C5E4] border border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] whitespace-nowrap text-center rounded-xs"
                  >
                    Focus This →
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Toggle Full Plan view */}
          {remainingAlternativesCount > 0 && (
            <div className="pt-1 text-center">
              <button
                type="button"
                id="toggle-full-ranked-plan-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  setShowAllRanked(!showAllRanked);
                }}
                className="font-mono text-[11px] font-bold text-[#2D3142] hover:underline inline-flex items-center gap-1"
              >
                {showAllRanked ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show fewer options</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>View all {scheduleResult.rankedTasks.length} ranked tasks in schedule</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
