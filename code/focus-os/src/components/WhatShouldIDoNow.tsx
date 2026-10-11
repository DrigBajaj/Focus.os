import React, { useState } from 'react';
import { Sparkles, Clock, Zap, ArrowRight, CheckCircle2, AlertTriangle, Lightbulb, ListPlus } from 'lucide-react';
import { TaskItem, Subtask } from '../types';
import { playMechanicalClick, playChiptuneBeep } from '../utils/audio';

interface WhatShouldIDoNowProps {
  tasks: TaskItem[];
  onStartFocusOnTask: (task: TaskItem) => void;
  onBreakdownTask: (taskId: string) => void;
  soundEnabled: boolean;
}

export const WhatShouldIDoNow: React.FC<WhatShouldIDoNowProps> = ({
  tasks,
  onStartFocusOnTask,
  onBreakdownTask,
  soundEnabled,
}) => {
  const [availableMinutes, setAvailableMinutes] = useState<number>(30);
  const [energyLevel, setEnergyLevel] = useState<'low' | 'med' | 'high'>('med');

  // Algorithm from Proposal Section 5.1 (Smart Planning):
  // Evaluates deadline urgency, priority, estimated duration vs available time, and user energy
  const activeTasks = tasks.filter((t) => !t.completed);

  // Scoring function
  const scoredTasks = activeTasks.map((task) => {
    let score = 0;
    const reasons: string[] = [];

    // Priority score
    if (task.priority === 'urgent') {
      score += 50;
      reasons.push('Marked as urgent priority');
    } else if (task.priority === 'high') {
      score += 35;
      reasons.push('High priority responsibility');
    } else if (task.priority === 'normal') {
      score += 20;
    } else {
      score += 10;
    }

    // Deadline urgency
    const lowerDeadline = task.deadline.toLowerCase();
    if (lowerDeadline.includes('today') || lowerDeadline.includes('tomorrow') || lowerDeadline.includes('5 pm')) {
      score += 40;
      reasons.push(`Deadline is pressing (${task.deadline})`);
    }

    // Available time fit
    const timeDiff = Math.abs(task.estimatedMinutes - availableMinutes);
    if (task.estimatedMinutes <= availableMinutes) {
      score += 30 - timeDiff * 0.5;
      reasons.push(`Fits within your available ${availableMinutes}-minute block (estimated ${task.estimatedMinutes}m)`);
    } else {
      score -= 20;
      reasons.push(`Longer than your available time (${task.estimatedMinutes}m vs ${availableMinutes}m) — consider breaking down`);
    }

    // Energy match
    const energyMap = { low: 1, med: 2, high: 3 };
    if (task.staminaPoints === energyMap[energyLevel]) {
      score += 25;
      reasons.push(`Matches your current ${energyLevel.toUpperCase()} energy level`);
    } else if (energyLevel === 'low' && task.staminaPoints > 1) {
      score -= 15;
    }

    return {
      task,
      score,
      reasons,
    };
  });

  scoredTasks.sort((a, b) => b.score - a.score);

  const bestMatch = scoredTasks[0];
  const alternativeMatches = scoredTasks.slice(1, 3);

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
          <span className="font-mono text-[10px] px-2 py-0.5 bg-[#CADBFB] border border-[#2D3142] text-[#2D3142] rounded-xs font-bold">
            Smart Priority
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Time Budget */}
          <div>
            <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#2D3142] mb-1.5">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#2D3142]/70" />
                <span>Available Window:</span>
              </span>
              <span className="px-1.5 bg-[#F4A261] border border-[#2D3142] text-[#2D3142] text-[10px] font-mono">
                {availableMinutes}m
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
              {[15, 25, 40, 60].map((mins) => (
                <button
                  key={mins}
                  id={`avail-time-btn-${mins}`}
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    setAvailableMinutes(mins);
                  }}
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
      </div>

      {/* Recommended Task Showcase Card */}
      {bestMatch ? (
        <div className="bg-[#CADBFB] border-2 border-[#2D3142] p-3.5 sm:p-5 pixel-shadow relative overflow-hidden rounded-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#7FB685] border border-[#2D3142] text-[#2D3142] rounded-xs shrink-0">
                ⭐ Recommended Next Step
              </span>
              <span className="font-mono text-[10px] text-[#2D3142]/80 truncate">
                ~{bestMatch.task.estimatedMinutes}m · +{bestMatch.task.staminaPoints} SP
              </span>
            </div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#FAF8F5] border border-[#2D3142] text-[#2D3142] rounded-xs shrink-0">
              Match {Math.round(bestMatch.score)}
            </span>
          </div>

          {/* Task Title & Details */}
          <div className="space-y-1 mb-3">
            <h2 className="font-mono text-base sm:text-xl font-bold text-[#2D3142] leading-snug break-words">
              {bestMatch.task.title}
            </h2>
            {bestMatch.task.notes && (
              <p className="font-sans text-xs text-[#2D3142]/85 bg-[#FAF8F5]/80 p-2.5 rounded-xs border border-[#2D3142]/15 leading-relaxed break-words">
                {bestMatch.task.notes}
              </p>
            )}
          </div>

          {/* Transparent Reasoning Section */}
          <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-3 mb-3 pixel-inset-soft rounded-xs">
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-[#2D3142] mb-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-[#F4A261] shrink-0" />
              <span>Why this task was selected</span>
            </div>
            <ul className="space-y-1.5 text-xs">
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
            <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-3 mb-3 rounded-xs space-y-1.5">
              <div className="font-mono text-[11px] font-bold text-[#2D3142] mb-1">
                Subtasks ({bestMatch.task.subtasks.filter(s => s.completed).length}/{bestMatch.task.subtasks.length} done):
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              id="start-recommended-focus-btn"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                playChiptuneBeep(659, soundEnabled);
                onStartFocusOnTask(bestMatch.task);
              }}
              className="pixel-btn min-h-[48px] flex-1 flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-[#7FB685] hover:bg-[#A3CFAB] border-2 border-[#2D3142] font-mono text-xs sm:text-sm md:text-base font-bold text-[#2D3142] pixel-shadow rounded-xs text-center"
            >
              <span className="truncate">🎮 Start Focus Quest ({bestMatch.task.estimatedMinutes}m)</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>

            {bestMatch.task.subtasks.length === 0 && (
              <button
                id="breakdown-recommended-task-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  onBreakdownTask(bestMatch.task.id);
                }}
                className="pixel-btn min-h-[44px] sm:min-h-[48px] flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-[#FAF8F5] hover:bg-[#F2EFE9] border-2 border-[#2D3142] font-mono text-xs sm:text-sm font-bold text-[#2D3142] pixel-shadow-sm rounded-xs whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-4 h-4 text-[#F4A261] shrink-0" />
                <span>Break Down (AI)</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#FAF8F5] border-2 border-dashed border-[#2D3142] p-8 text-center rounded-xs">
          <p className="font-mono text-xs font-bold text-[#2D3142]">
            All active tasks are complete!
          </p>
          <p className="font-sans text-xs text-[#2D3142]/70 mt-1">
            Enjoy your well-earned break or add a new task in the Planner.
          </p>
        </div>
      )}

      {/* Alternative Recommendations */}
      {alternativeMatches.length > 0 && (
        <div className="bg-[#F2EFE9] border-2 border-[#2D3142] p-3.5 sm:p-4 pixel-shadow rounded-xs">
          <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-2 mb-2">
            <span className="font-mono text-xs font-bold text-[#2D3142]">
              Other Options
            </span>
            <span className="font-sans text-[11px] text-[#2D3142]/70 hidden sm:inline">
              Prefer another task? Choose below:
            </span>
          </div>

          <div className="space-y-2">
            {alternativeMatches.map(({ task, reasons }) => (
              <div
                key={task.id}
                className="bg-[#FAF8F5] border-2 border-[#2D3142] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pixel-shadow-sm rounded-xs"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs sm:text-sm font-bold text-[#2D3142] leading-snug break-words">
                    {task.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px] font-sans text-[#2D3142]/70 mt-1">
                    <span className="font-mono text-[9px] font-bold uppercase px-1 border border-[#2D3142] bg-[#CADBFB]">{task.priority}</span>
                    <span>·</span>
                    <span className="font-mono text-[10px]">~{task.estimatedMinutes}m</span>
                    <span>·</span>
                    <span className="truncate max-w-[200px] sm:max-w-none">{reasons[0]}</span>
                  </div>
                </div>

                <button
                  id={`select-alt-task-${task.id}`}
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    onStartFocusOnTask(task);
                  }}
                  className="pixel-btn min-h-[40px] px-3.5 py-1.5 bg-[#CADBFB] hover:bg-[#B4C5E4] border border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] whitespace-nowrap self-stretch sm:self-center text-center rounded-xs"
                >
                  Focus This →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
