import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Wind,
  Coffee,
  Zap,
  Brain,
  Check,
  Disc,
  ExternalLink,
  Flame,
  Award,
  Sparkles,
  ChevronRight,
  Maximize2,
  Minimize2,
  CloudRain,
  Volume2,
  VolumeX,
  Target,
  Shield,
  HelpCircle,
  X,
  FastForward,
  CheckCircle2,
} from 'lucide-react';
import {
  FocusMode,
  TaskItem,
  PetState,
  StreakInfo,
  QuestDifficulty,
  QuestPhase,
  FocusQuestConfig,
  Subtask,
} from '../types';
import {
  playMechanicalClick,
  playChiptuneBeep,
  playVictoryFanfare,
  playQuestComplete,
} from '../utils/audio';
import { getCurrentPetStage } from '../data/petEvolutions';
import { generateAdaptivePhases, calculateQuestDifficulty, buildQuestFromTask } from '../utils/questPlanner';

interface FocusScreenProps {
  soundEnabled: boolean;
  onSessionComplete: (minutes: number) => void;
  onQuestComplete: (questConfig: FocusQuestConfig, minutes: number, taskId?: string) => void;
  isTimerRunning: boolean;
  setIsTimerRunning: (running: boolean) => void;
  activeTask: TaskItem | null;
  tasks: TaskItem[];
  onSelectActiveTask: (task: TaskItem) => void;
  onClearActiveTask: () => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  pet: PetState;
  onFeedBerry: () => void;
  streakInfo: StreakInfo;
  ambientNoise: boolean;
  onToggleAmbient: () => void;
  isRetroLofiActive: boolean;
  onToggleRetroLofi: (active: boolean) => void;
  onOpenMusicTab: () => void;
}

const CLASSIC_MODES: Record<Exclude<FocusMode, 'quest'>, { label: string; minutes: number; desc: string; icon: React.ReactNode }> = {
  deep: {
    label: 'DEEP WORK',
    minutes: 25,
    desc: 'Classic 25-minute Pomodoro sprint for structured flow.',
    icon: <Brain className="w-4 h-4" />,
  },
  sprint: {
    label: 'MICRO BURST',
    minutes: 10,
    desc: 'ADHD low-friction starter. Overcome task paralysis.',
    icon: <Zap className="w-4 h-4" />,
  },
  breathe: {
    label: 'BOX BREATHING',
    minutes: 5,
    desc: '4-4-4-4 sensory calm pace to lower cortisol.',
    icon: <Wind className="w-4 h-4" />,
  },
  rest: {
    label: 'COZY BREAK',
    minutes: 5,
    desc: 'Step away from the screen, stretch, and sip water.',
    icon: <Coffee className="w-4 h-4" />,
  },
};

export const FocusScreen: React.FC<FocusScreenProps> = ({
  soundEnabled,
  onSessionComplete,
  onQuestComplete,
  isTimerRunning,
  setIsTimerRunning,
  activeTask,
  tasks,
  onSelectActiveTask,
  onClearActiveTask,
  onToggleSubtask,
  onCompleteTask,
  pet,
  onFeedBerry,
  streakInfo,
  ambientNoise,
  onToggleAmbient,
  isRetroLofiActive,
  onToggleRetroLofi,
  onOpenMusicTab,
}) => {
  // Mode: 'quest' is primary default!
  const [activeMode, setActiveMode] = useState<FocusMode>('quest');
  const [classicPreset, setClassicPreset] = useState<Exclude<FocusMode, 'quest'>>('deep');

  // Distraction-Free full HUD toggle during session
  const [isDistractionFree, setIsDistractionFree] = useState<boolean>(false);

  // Quest State
  const [questConfig, setQuestConfig] = useState<FocusQuestConfig>(() => {
    if (activeTask) return buildQuestFromTask(activeTask);
    const firstActive = tasks.find((t) => !t.completed);
    if (firstActive) return buildQuestFromTask(firstActive);
    return {
      id: 'quest-default',
      title: 'Finish DBMS assignment',
      estimatedMinutes: 45,
      difficulty: 'Medium',
      goalDescription: 'Complete 3 subtasks',
      phases: generateAdaptivePhases(45),
      xpReward: 50,
      petHappinessReward: 10,
    };
  });

  // Track if Quest is actively in-progress
  const [isQuestActive, setIsQuestActive] = useState<boolean>(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState<number>(0);

  // Phase countdown timer
  const currentPhase = questConfig.phases[currentPhaseIndex] || questConfig.phases[0];
  const [phaseSecondsLeft, setPhaseSecondsLeft] = useState<number>(
    (currentPhase?.minutes || 25) * 60
  );
  const [totalQuestSecondsElapsed, setTotalQuestSecondsElapsed] = useState<number>(0);

  // Completed Victory Modal state
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
  const [completedQuestSummary, setCompletedQuestSummary] = useState<{
    title: string;
    minutes: number;
    subtasksCompleted: number;
    subtasksTotal: number;
  } | null>(null);

  // Soft visual anxiety-free timer mode toggle (Zen Flow vs Countdown Digits)
  const [zenTimerMode, setZenTimerMode] = useState<boolean>(false);

  // Accidental abort safeguard (Hold/Confirm before losing sprint)
  const [showAbortConfirm, setShowAbortConfirm] = useState<boolean>(false);

  // Classic mode timer values
  const [classicTimeLeft, setClassicTimeLeft] = useState<number>(25 * 60);
  const [classicTotalSeconds, setClassicTotalSeconds] = useState<number>(25 * 60);

  // Breathing pacer values
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold' | 'Exhale' | 'Rest'>('Inhale');
  const [breathSeconds, setBreathSeconds] = useState(4);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep quest config synced when activeTask changes and no quest is currently running
  useEffect(() => {
    if (!isQuestActive && activeTask) {
      setQuestConfig(buildQuestFromTask(activeTask));
      const firstPhase = generateAdaptivePhases(activeTask.estimatedMinutes || 45)[0];
      setPhaseSecondsLeft((firstPhase?.minutes || 25) * 60);
      setCurrentPhaseIndex(0);
      setTotalQuestSecondsElapsed(0);
    }
  }, [activeTask, isQuestActive]);

  // Compute total quest seconds
  const totalQuestSeconds = questConfig.phases.reduce((sum, p) => sum + p.minutes * 60, 0);

  // Current stage sprite
  const currentStage = getCurrentPetStage(pet.id, pet.level);

  // Quest progress percentage
  const questProgressRatio =
    totalQuestSeconds > 0
      ? Math.min(1, totalQuestSecondsElapsed / totalQuestSeconds)
      : 0;
  const questProgressPercent = Math.round(questProgressRatio * 100);

  // Current phase progress percentage
  const currentPhaseTotalSec = (currentPhase?.minutes || 25) * 60;
  const currentPhaseRatio =
    currentPhaseTotalSec > 0
      ? Math.min(1, (currentPhaseTotalSec - phaseSecondsLeft) / currentPhaseTotalSec)
      : 0;

  // Pet Reaction Dialogue Generator
  const getPetDialogue = () => {
    if (!isQuestActive) {
      return `Ready when you are! Let's conquer "${questConfig.title}" together!`;
    }
    if (!isTimerRunning) {
      return 'Session paused. Take a quick breath and press Resume whenever you feel steady.';
    }
    if (currentPhase.type === 'break') {
      return 'Recharge break! Unclench your jaw, drink some water, and stretch your arms.';
    }
    if (questProgressPercent < 25) {
      return `Locked in on ${questConfig.title}! We've got this first sprint!`;
    }
    if (questProgressPercent < 55) {
      return 'Great focus flow! You are building serious study momentum!';
    }
    if (questProgressPercent < 85) {
      return 'Over halfway! Look at that progress bar advancing!';
    }
    return 'Final stretch of the quest! Finish strong!';
  };

  // Launch Focus Quest
  const handleLaunchQuest = () => {
    playMechanicalClick(soundEnabled);
    playChiptuneBeep(659.25, soundEnabled);
    setIsQuestActive(true);
    setCurrentPhaseIndex(0);
    const firstPhase = questConfig.phases[0];
    setPhaseSecondsLeft(firstPhase ? firstPhase.minutes * 60 : 25 * 60);
    setTotalQuestSecondsElapsed(0);
    setIsTimerRunning(true);
  };

  // Toggle Quest Timer (Play / Pause)
  const handleToggleTimer = () => {
    playMechanicalClick(soundEnabled);
    if (!isTimerRunning) {
      playChiptuneBeep(659.25, soundEnabled);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  // Advance to Next Phase manually or automatically
  const handleAdvancePhase = () => {
    playMechanicalClick(soundEnabled);
    const nextIdx = currentPhaseIndex + 1;
    if (nextIdx < questConfig.phases.length) {
      playChiptuneBeep(783.99, soundEnabled);
      setCurrentPhaseIndex(nextIdx);
      const nextPhase = questConfig.phases[nextIdx];
      setPhaseSecondsLeft(nextPhase.minutes * 60);
      setIsTimerRunning(true);
    } else {
      // Completed all phases! Finish Quest!
      finishQuestSession();
    }
  };

  // Finish Quest & Trigger Rewards
  const finishQuestSession = () => {
    setIsTimerRunning(false);
    setIsQuestActive(false);
    playVictoryFanfare(soundEnabled);

    const totalMinutes = Math.max(1, Math.round(totalQuestSecondsElapsed / 60)) || questConfig.estimatedMinutes;
    const taskSubtasks = activeTask?.subtasks || [];
    const doneSubtasks = taskSubtasks.filter((s) => s.completed).length;

    setCompletedQuestSummary({
      title: questConfig.title,
      minutes: totalMinutes,
      subtasksCompleted: doneSubtasks,
      subtasksTotal: taskSubtasks.length,
    });

    // Award +50 XP, +10 Happiness (+2 treats), and Maintain Streak in App state
    onQuestComplete(questConfig, totalMinutes, activeTask?.id);
    setShowVictoryModal(true);
  };

  // Abort / Reset Quest with Accidental Click Guard
  const handleAbortQuest = () => {
    playMechanicalClick(soundEnabled);
    setShowAbortConfirm(true);
  };

  const handleAbortQuestConfirmed = () => {
    playMechanicalClick(soundEnabled);
    setShowAbortConfirm(false);
    setIsTimerRunning(false);
    setIsQuestActive(false);
    setCurrentPhaseIndex(0);
    const firstPhase = questConfig.phases[0];
    setPhaseSecondsLeft(firstPhase ? firstPhase.minutes * 60 : 25 * 60);
    setTotalQuestSecondsElapsed(0);
  };

  // Add 5 Min to current phase
  const handleAddFiveMin = () => {
    playMechanicalClick(soundEnabled);
    playChiptuneBeep(784, soundEnabled);
    if (activeMode === 'quest') {
      setPhaseSecondsLeft((prev) => prev + 300);
    } else {
      setClassicTimeLeft((prev) => prev + 300);
      setClassicTotalSeconds((prev) => prev + 300);
    }
  };

  // Main countdown timer interval
  useEffect(() => {
    if (!isTimerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (activeMode === 'quest' && isQuestActive) {
        setTotalQuestSecondsElapsed((prev) => prev + 1);
        setPhaseSecondsLeft((prev) => {
          if (prev <= 1) {
            // Phase ended!
            const nextIdx = currentPhaseIndex + 1;
            if (nextIdx < questConfig.phases.length) {
              playChiptuneBeep(880, soundEnabled);
              setCurrentPhaseIndex(nextIdx);
              return questConfig.phases[nextIdx].minutes * 60;
            } else {
              clearInterval(timerRef.current!);
              finishQuestSession();
              return 0;
            }
          }
          return prev - 1;
        });
      } else if (activeMode !== 'quest') {
        // Classic Timer
        setClassicTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsTimerRunning(false);
            playVictoryFanfare(soundEnabled);
            const sessionMins = CLASSIC_MODES[classicPreset].minutes;
            onSessionComplete(sessionMins);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [
    isTimerRunning,
    activeMode,
    isQuestActive,
    currentPhaseIndex,
    questConfig,
    classicPreset,
    soundEnabled,
  ]);

  // Breathing pacer cycle
  useEffect(() => {
    if (activeMode !== 'breathe' || !isTimerRunning) return;

    const breathInterval = setInterval(() => {
      setBreathSeconds((prev) => {
        if (prev <= 1) {
          setBreathPhase((curr) => {
            if (curr === 'Inhale') return 'Hold';
            if (curr === 'Hold') return 'Exhale';
            if (curr === 'Exhale') return 'Rest';
            return 'Inhale';
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(breathInterval);
  }, [activeMode, isTimerRunning]);

  // Format time MM:SS
  const displaySeconds = activeMode === 'quest' ? phaseSecondsLeft : classicTimeLeft;
  const minutes = Math.floor(displaySeconds / 60);
  const seconds = displaySeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Segmented progress blocks (16 discrete chunks)
  const totalBlocks = 16;
  const filledBlocks = Math.min(
    totalBlocks,
    Math.round(
      (activeMode === 'quest' ? currentPhaseRatio : (classicTotalSeconds - classicTimeLeft) / classicTotalSeconds) *
        totalBlocks
    )
  );

  return (
    <div className={`w-full space-y-3 sm:space-y-4 ${isDistractionFree ? 'bg-[#FAF8F5]' : ''}`}>
      {/* ========================================================================= */}
      {/* 1. TOP MODE SWITCHER: FOCUS QUEST (DEFAULT) vs CLASSIC SPRINTS           */}
      {/* ========================================================================= */}
      {!isQuestActive && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-1.5 bg-[#F2EFE9] border-2 border-[#2D3142] pixel-shadow">
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:items-center">
            <button
              id="mode-tab-quest-btn"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                setActiveMode('quest');
              }}
              className={`pixel-btn px-2.5 sm:px-3 py-1.5 font-mono text-[11px] sm:text-xs font-bold border-2 border-[#2D3142] flex items-center justify-center gap-1.5 transition-all rounded-xs ${
                activeMode === 'quest'
                  ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow-sm'
                  : 'bg-[#FAF8F5] text-[#2D3142]/70 hover:bg-[#CADBFB]'
              }`}
            >
              <span>🎮 FOCUS QUEST</span>
              <span className="hidden xs:inline text-[9px] px-1 bg-[#FAF8F5] border border-[#2D3142] rounded-xs">
                PLAYABLE
              </span>
            </button>

            <button
              id="mode-tab-classic-btn"
              onClick={() => {
                playMechanicalClick(soundEnabled);
                setActiveMode('deep');
                setClassicPreset('deep');
                setClassicTimeLeft(25 * 60);
                setClassicTotalSeconds(25 * 60);
              }}
              className={`pixel-btn px-2.5 sm:px-3 py-1.5 font-mono text-[11px] sm:text-xs font-bold border-2 border-[#2D3142] flex items-center justify-center gap-1.5 transition-all rounded-xs ${
                activeMode !== 'quest'
                  ? 'bg-[#CADBFB] text-[#2D3142] pixel-shadow-sm'
                  : 'bg-[#FAF8F5] text-[#2D3142]/70 hover:bg-[#CADBFB]'
              }`}
            >
              <span>⏱ CLASSIC</span>
            </button>
          </div>

          <div className="font-mono text-[10px] text-[#2D3142]/80 px-1 text-center sm:text-right">
            {activeMode === 'quest'
              ? 'Adaptive Session • 25m Focus → 5m Break → 20m Focus'
              : 'Traditional Pomodoro / Box Breathing'}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. FOCUS QUEST: CLEAN UNIFIED BRIEFING CARD                               */}
      {/* ========================================================================= */}
      {activeMode === 'quest' && !isQuestActive && (
        <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-4 sm:p-6 pixel-shadow space-y-3.5">
          {/* Card Top Header */}
          <div className="flex items-center justify-between border-b-2 border-[#2D3142] pb-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs sm:text-sm font-black px-2 py-0.5 bg-[#7FB685] border border-[#2D3142] text-[#2D3142]">
                🎮 FOCUS QUEST
              </span>
              <span className="font-mono text-xs text-[#2D3142]/70 font-bold hidden sm:inline">
                Adaptive Session
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#CADBFB] border border-[#2D3142] text-[#2D3142] rounded-xs">
                ⚔️ {questConfig.difficulty.toUpperCase()}
              </span>
              <span className="font-mono text-[10px] sm:text-xs font-bold px-2 py-0.5 bg-[#F8C390] border border-[#2D3142] text-[#2D3142] rounded-xs">
                ⭐ +50 XP
              </span>
            </div>
          </div>

          {/* Quest Core Info */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="font-mono text-xs text-[#2D3142]/60 font-bold uppercase shrink-0">Quest:</span>
                <h2 className="font-mono text-base sm:text-lg font-bold text-[#2D3142] truncate">
                  {questConfig.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-xs font-bold text-[#2D3142] bg-[#EBF3EC] px-2 py-0.5 border border-[#2D3142]/30 rounded-xs">
                  ⏱ {questConfig.estimatedMinutes} min
                </span>
              </div>
            </div>

            {/* Task Switcher (clean inline) */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 pt-0.5 w-full">
              <label htmlFor="quest-task-select" className="font-mono text-[10px] text-[#2D3142]/70 uppercase font-bold shrink-0">
                Target Task:
              </label>
              <select
                id="quest-task-select"
                value={activeTask?.id || ''}
                onChange={(e) => {
                  const selected = tasks.find((t) => t.id === e.target.value);
                  if (selected) {
                    playMechanicalClick(soundEnabled);
                    onSelectActiveTask(selected);
                    setQuestConfig(buildQuestFromTask(selected));
                  }
                }}
                className="w-full flex-1 max-w-full sm:max-w-sm px-2 py-1.5 bg-[#FAF8F5] border border-[#2D3142] font-mono text-xs text-[#2D3142] focus:outline-none rounded-xs truncate"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.estimatedMinutes}m) {t.completed ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Partner & Specs Banner */}
          <div className="p-3 bg-[#F2EFE9] border border-[#2D3142] rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Mascot Readiness */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-[#FAF8F5] border border-[#2D3142] rounded-md flex items-center justify-center shrink-0">
                {currentStage.renderSprite({
                  isFocusActive: false,
                  mood: pet.mood,
                  level: pet.level,
                })}
              </div>
              <div>
                <div className="font-mono text-xs font-bold text-[#2D3142] flex items-center gap-1.5">
                  <span>🐾 Pixel Pet: Ready</span>
                  <span className="text-[10px] px-1 bg-[#7FB685] border border-[#2D3142] rounded-xs">
                    {pet.name} Lv.{pet.level}
                  </span>
                </div>
                <p className="font-sans text-[11px] text-[#2D3142]/75 italic mt-0.5 line-clamp-1">
                  &quot;{getPetDialogue()}&quot;
                </p>
              </div>
            </div>

            {/* Goal badge */}
            <div className="font-mono text-xs font-bold text-[#2D3142] bg-[#FAF8F5] px-2.5 py-1 border border-[#2D3142] rounded-xs shrink-0">
              🎯 Goal: {questConfig.goalDescription}
            </div>
          </div>

          {/* Adaptive Pacing Flow */}
          <div className="space-y-1.5">
            <div className="font-mono text-[11px] font-bold text-[#2D3142]/80 flex items-center justify-between">
              <span>Pacing Sequence</span>
              <span className="text-[10px] text-[#2D3142]/60">{questConfig.phases.length} Phases</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
              {questConfig.phases.map((phase, idx) => (
                <div key={phase.id || idx} className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`px-3 py-1.5 border border-[#2D3142] font-mono text-xs font-bold flex items-center gap-1.5 rounded-xs ${
                      phase.type === 'focus'
                        ? 'bg-[#CADBFB] text-[#2D3142]'
                        : 'bg-[#F8C390] text-[#2D3142]'
                    }`}
                  >
                    {phase.type === 'focus' ? (
                      <Brain className="w-3.5 h-3.5" />
                    ) : (
                      <Coffee className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {phase.minutes}m {phase.type === 'focus' ? 'Focus' : 'Break'}
                    </span>
                  </div>

                  {idx < questConfig.phases.length - 1 && (
                    <span className="font-mono font-bold text-[#2D3142]/50 text-xs">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Subtasks if present */}
          {activeTask && activeTask.subtasks.length > 0 && (
            <div className="pt-2.5 border-t border-[#2D3142]/20 space-y-2">
              <div className="font-mono text-[11px] font-bold text-[#2D3142]/80 flex items-center justify-between">
                <span>Subtasks ({activeTask.subtasks.filter((s) => s.completed).length}/{activeTask.subtasks.length} done)</span>
                <span className="text-[10px] text-[#2D3142]/60 font-sans">Tap row to check</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeTask.subtasks.map((sub) => (
                  <button
                    type="button"
                    key={sub.id}
                    onClick={() => {
                      if (!sub.completed) playQuestComplete(soundEnabled);
                      else playMechanicalClick(soundEnabled);
                      onToggleSubtask(activeTask.id, sub.id);
                    }}
                    className={`pixel-btn min-h-[44px] w-full text-left flex items-center gap-2.5 px-3 py-2 border border-[#2D3142] text-xs font-sans rounded-xs transition-colors ${
                      sub.completed ? 'bg-[#E4DFD5]/50 text-[#2D3142]/60' : 'bg-[#FAF8F5] hover:bg-[#F2EFE9]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-xs border-2 border-[#2D3142] flex items-center justify-center shrink-0 ${
                      sub.completed ? 'bg-[#7FB685] text-[#2D3142]' : 'bg-[#FAF8F5]'
                    }`}>
                      {sub.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                    <span className={`truncate flex-1 font-medium ${sub.completed ? 'line-through' : ''}`}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sound Toggles & Primary Start Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Quick sound pills */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                id="quest-rain-toggle-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  onToggleAmbient();
                }}
                className={`pixel-btn min-h-[42px] px-3 py-2 border border-[#2D3142] font-mono text-xs font-bold flex items-center justify-center gap-1.5 rounded-xs transition-colors ${
                  ambientNoise
                    ? 'bg-[#7FB685] text-[#2D3142]'
                    : 'bg-[#FAF8F5] text-[#2D3142]/70 hover:bg-[#F2EFE9]'
                }`}
              >
                <CloudRain className="w-4 h-4 shrink-0" />
                <span>{ambientNoise ? 'Rain: On' : 'Rain: Off'}</span>
              </button>

              <button
                type="button"
                id="quest-lofi-toggle-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  onToggleRetroLofi(!isRetroLofiActive);
                }}
                className={`pixel-btn min-h-[42px] px-3 py-2 border border-[#2D3142] font-mono text-xs font-bold flex items-center justify-center gap-1.5 rounded-xs transition-colors ${
                  isRetroLofiActive
                    ? 'bg-[#F4A261] text-[#2D3142]'
                    : 'bg-[#FAF8F5] text-[#2D3142]/70 hover:bg-[#F2EFE9]'
                }`}
              >
                <Disc className={`w-4 h-4 shrink-0 ${isRetroLofiActive ? 'animate-spin' : ''}`} />
                <span>{isRetroLofiActive ? 'Lo-Fi: On' : '8-Bit Lo-Fi'}</span>
              </button>
            </div>

            {/* Clear Hero Start Button */}
            <button
              type="button"
              id="launch-focus-quest-btn"
              onClick={handleLaunchQuest}
              className="pixel-btn pixel-btn-lg min-h-[48px] w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 bg-[#7FB685] hover:bg-[#A3CFAB] border-2 border-[#2D3142] font-mono text-xs sm:text-sm font-bold text-[#2D3142] pixel-shadow rounded-xs text-center"
            >
              <Play className="w-4 h-4 fill-current shrink-0" />
              <span>START FOCUS SPRINT ({questConfig.phases[0]?.minutes || 25}M)</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ACTIVE FOCUS QUEST: DISTRACTION-FREE IN-SESSION HUD                    */}
      {/* ========================================================================= */}
      {activeMode === 'quest' && isQuestActive && (
        <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-4 sm:p-7 pixel-shadow-lg relative space-y-4">
          {/* Top Status & Controls */}
          <div className="flex items-center justify-between border-b-2 border-[#2D3142]/20 pb-2.5 gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <span
                className={`font-mono text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 border border-[#2D3142] rounded-xs shrink-0 ${
                  currentPhase.type === 'focus'
                    ? 'bg-[#7FB685] text-[#2D3142]'
                    : 'bg-[#F8C390] text-[#2D3142]'
                }`}
              >
                {currentPhase.type === 'focus' ? '⚔️ Focus' : '☕ Break'}
              </span>
              <span className="font-mono text-xs sm:text-sm font-bold text-[#2D3142] truncate">
                {questConfig.title}
              </span>
              <span className="hidden xs:inline font-mono text-[10px] sm:text-xs text-[#2D3142]/70 shrink-0">
                (Phase {currentPhaseIndex + 1}/{questConfig.phases.length})
              </span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="font-mono text-[10px] sm:text-xs font-bold text-[#2D3142] flex items-center gap-1 sm:gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTimerRunning ? 'bg-[#7FB685] animate-ping' : 'bg-[#F4A261]'
                  }`}
                />
                <span className="hidden xs:inline">{isTimerRunning ? 'Active' : 'Paused'}</span>
              </div>
              <button
                type="button"
                onClick={handleAbortQuest}
                className="pixel-btn px-2 sm:px-2.5 py-1 font-mono text-[10px] sm:text-[11px] font-bold text-[#ba1a1a] hover:bg-[#ffdad6]/50 border border-[#ba1a1a]/40 rounded-xs shrink-0"
              >
                End [×]
              </button>
            </div>
          </div>

          {/* Accidental Click Guard Safeguard Banner */}
          {showAbortConfirm && (
            <div className="p-3 bg-[#FFF1F0] border-2 border-[#BA1A1A] rounded-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 pixel-shadow-sm">
              <div className="flex items-center gap-2 text-[#BA1A1A] font-mono text-xs font-bold">
                <span>⚠️ End session early? Current sprint phase will be paused.</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowAbortConfirm(false)}
                  className="pixel-btn min-h-[38px] flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#FAF8F5] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] rounded-xs"
                >
                  Keep Focusing
                </button>
                <button
                  type="button"
                  onClick={handleAbortQuestConfirmed}
                  className="pixel-btn min-h-[38px] flex-1 sm:flex-initial px-3.5 py-1.5 bg-[#BA1A1A] text-white border-2 border-[#2D3142] font-mono text-xs font-bold rounded-xs"
                >
                  Yes, End Session
                </button>
              </div>
            </div>
          )}

          {/* Phase Flow Indicator (compact badges) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {questConfig.phases.map((p, idx) => {
              const isCurrent = idx === currentPhaseIndex;
              const isDone = idx < currentPhaseIndex;
              return (
                <div key={p.id || idx} className="flex items-center gap-1.5 shrink-0">
                  <div
                    className={`px-2.5 py-1 border font-mono text-[10px] sm:text-xs font-bold rounded-xs ${
                      isCurrent
                        ? p.type === 'focus'
                          ? 'bg-[#7FB685] border-[#2D3142] text-[#2D3142] pixel-shadow-sm'
                          : 'bg-[#F8C390] border-[#2D3142] text-[#2D3142] pixel-shadow-sm'
                        : isDone
                        ? 'bg-[#E4DFD5] border-transparent text-[#2D3142]/50 line-through'
                        : 'bg-[#FAF8F5] border-[#2D3142]/30 text-[#2D3142]/60'
                    }`}
                  >
                    {isDone ? '✓ ' : ''}
                    {p.minutes}m {p.type === 'focus' ? 'Focus' : 'Break'}
                  </div>
                  {idx < questConfig.phases.length - 1 && (
                    <span className="font-mono text-[#2D3142]/40 text-xs">→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hero Timer Display: Ticking Digits OR Soft Anxiety-Free Zen Bar */}
          <div className="py-2 flex flex-col items-center justify-center select-none">
            {!zenTimerMode ? (
              /* High-Contrast Digits Mode */
              <div className="font-mono text-6xl sm:text-8xl md:text-9xl font-black tracking-tight text-[#2D3142] filter drop-shadow-[2px_2px_0px_#CADBFB] sm:drop-shadow-[4px_4px_0px_#CADBFB]">
                {timeFormatted}
              </div>
            ) : (
              /* Soft Anxiety-Free Zen Flow Mode */
              <div className="w-full max-w-lg flex flex-col items-center justify-center py-4 px-3 bg-[#EBF3EC] border-2 border-[#2D3142] rounded-xs pixel-inset-soft text-center space-y-2">
                <div className="flex items-center gap-2 font-mono text-sm sm:text-base font-bold text-[#2D3142]">
                  <Wind className="w-4 h-4 text-[#7FB685] animate-pulse" />
                  <span>
                    ~{Math.max(1, Math.ceil(phaseSecondsLeft / 60))} min remaining in {currentPhase.type === 'focus' ? 'Focus Sprint' : 'Recharge Break'}
                  </span>
                </div>
                {/* Fluid pulsing bar */}
                <div className="w-full bg-[#FAF8F5] border-2 border-[#2D3142] p-1 h-5 rounded-xs overflow-hidden">
                  <div
                    className="h-full bg-[#7FB685] transition-all duration-1000 ease-linear rounded-xs"
                    style={{ width: `${Math.round(currentPhaseRatio * 100)}%` }}
                  />
                </div>
                <p className="font-sans text-xs text-[#2D3142]/80 italic">
                  {currentPhase.type === 'focus'
                    ? 'Deep focus flow · Single-tasking with calm clarity'
                    : 'Resting mind · Relax your eyes and breathe deeply'}
                </p>
              </div>
            )}

            {/* Timer Style Switcher (Digits vs Zen Flow) */}
            <div className="flex items-center justify-center gap-1 mt-2.5">
              <div className="inline-flex p-0.5 bg-[#F2EFE9] border border-[#2D3142] rounded-xs">
                <button
                  type="button"
                  id="timer-style-digits-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    setZenTimerMode(false);
                  }}
                  className={`px-3 py-1 font-mono text-[10px] sm:text-xs font-bold rounded-xs transition-colors ${
                    !zenTimerMode
                      ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow-sm'
                      : 'text-[#2D3142]/70 hover:text-[#2D3142]'
                  }`}
                >
                  ⏱ Countdown Digits
                </button>
                <button
                  type="button"
                  id="timer-style-zen-btn"
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    setZenTimerMode(true);
                  }}
                  className={`px-3 py-1 font-mono text-[10px] sm:text-xs font-bold rounded-xs transition-colors ${
                    zenTimerMode
                      ? 'bg-[#7FB685] text-[#2D3142] pixel-shadow-sm'
                      : 'text-[#2D3142]/70 hover:text-[#2D3142]'
                  }`}
                >
                  🌊 Zen Flow Bar
                </button>
              </div>
            </div>
          </div>

          {/* Phase Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between font-mono text-[11px] sm:text-xs">
              <span className="font-bold text-[#2D3142]">
                {currentPhase.type === 'focus' ? 'Focus Sprint Progress' : 'Break Progress'}
              </span>
              <span className="font-bold text-[#2D3142]">
                {Math.round(currentPhaseRatio * 100)}%
              </span>
            </div>

            <div className="w-full bg-[#E4DFD5] border-2 border-[#2D3142] p-0.5 sm:p-1 h-4 sm:h-5 flex gap-0.5 sm:gap-1 pixel-inset">
              {Array.from({ length: totalBlocks }).map((_, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-full transition-colors ${
                    idx < filledBlocks
                      ? currentPhase.type === 'focus'
                        ? 'bg-[#7FB685]'
                        : 'bg-[#F4A261]'
                      : 'bg-transparent'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Pet Companion Live Reaction Banner */}
          <div className="p-3 bg-[#F2EFE9] border border-[#2D3142] rounded-xs flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-[#FAF8F5] border border-[#2D3142] rounded-md flex items-center justify-center shrink-0">
              {currentStage.renderSprite({
                isFocusActive: isTimerRunning,
                mood: isTimerRunning ? 'focusing' : 'happy',
                level: pet.level,
              })}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 font-mono text-[10px] sm:text-[11px] font-bold text-[#2D3142]">
                <span>🐾 {pet.name}:</span>
                <span className="text-[9px] px-1 bg-[#7FB685] border border-[#2D3142] rounded-xs">
                  {currentPhase.type === 'focus' ? 'FOCUSED' : 'RELAXED'}
                </span>
              </div>
              <p className="font-sans text-xs text-[#2D3142] font-medium mt-0.5 truncate">
                &quot;{getPetDialogue()}&quot;
              </p>
            </div>
          </div>

          {/* In-Session Subtasks Checklist (Expanded Touch Targets) */}
          {activeTask && activeTask.subtasks.length > 0 && (
            <div className="p-3 bg-[#F2EFE9] border border-[#2D3142] rounded-xs space-y-2">
              <div className="font-mono text-[11px] font-bold text-[#2D3142]/80 flex items-center justify-between">
                <span>Subtasks ({activeTask.subtasks.filter((s) => s.completed).length}/{activeTask.subtasks.length} done)</span>
                <span className="text-[10px] text-[#2D3142]/60 font-sans">Tap row to check off</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeTask.subtasks.map((sub) => (
                  <button
                    type="button"
                    key={sub.id}
                    onClick={() => {
                      if (!sub.completed) playQuestComplete(soundEnabled);
                      else playMechanicalClick(soundEnabled);
                      onToggleSubtask(activeTask.id, sub.id);
                    }}
                    className={`pixel-btn min-h-[44px] w-full text-left flex items-center gap-2.5 px-3 py-2 border border-[#2D3142] text-xs font-sans rounded-xs transition-colors ${
                      sub.completed ? 'bg-[#E4DFD5]/70 text-[#2D3142]/60' : 'bg-[#FAF8F5] hover:bg-[#CADBFB]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-xs border-2 border-[#2D3142] flex items-center justify-center shrink-0 ${
                      sub.completed ? 'bg-[#7FB685] text-[#2D3142]' : 'bg-[#FAF8F5]'
                    }`}>
                      {sub.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </span>
                    <span className={`truncate flex-1 font-medium ${sub.completed ? 'line-through' : ''}`}>
                      {sub.title}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mechanical Action Dock & Quick Sound Toggles */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Audio Toggles */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                id="active-quest-rain-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  onToggleAmbient();
                }}
                className={`pixel-btn min-h-[42px] px-2.5 sm:px-3 py-2 border border-[#2D3142] font-mono text-xs font-bold rounded-xs flex items-center justify-center gap-1.5 ${
                  ambientNoise ? 'bg-[#7FB685] text-[#2D3142]' : 'bg-[#FAF8F5] text-[#2D3142]/70'
                }`}
              >
                <CloudRain className="w-4 h-4 shrink-0" />
                <span>{ambientNoise ? 'Rain: On' : 'Rain: Off'}</span>
              </button>

              <button
                type="button"
                id="active-quest-lofi-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  onToggleRetroLofi(!isRetroLofiActive);
                }}
                className={`pixel-btn min-h-[42px] px-2.5 sm:px-3 py-2 border border-[#2D3142] font-mono text-xs font-bold rounded-xs flex items-center justify-center gap-1.5 ${
                  isRetroLofiActive ? 'bg-[#F4A261] text-[#2D3142]' : 'bg-[#FAF8F5] text-[#2D3142]/70'
                }`}
              >
                <Disc className={`w-4 h-4 shrink-0 ${isRetroLofiActive ? 'animate-spin' : ''}`} />
                <span>{isRetroLofiActive ? 'Lo-Fi: On' : 'Lo-Fi: Off'}</span>
              </button>
            </div>

            {/* Primary Action Controls */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                id="quest-play-pause-btn"
                onClick={handleToggleTimer}
                className={`pixel-btn min-h-[44px] flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 border-2 border-[#2D3142] font-mono text-xs sm:text-sm font-bold rounded-xs ${
                  isTimerRunning
                    ? 'bg-[#F8C390] hover:bg-[#F4A261] text-[#2D3142] pixel-shadow-sm'
                    : 'bg-[#7FB685] hover:bg-[#A3CFAB] text-[#2D3142] pixel-shadow'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-[#2D3142] shrink-0" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-[#2D3142] shrink-0" />
                    <span>Resume</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="quest-add-time-btn"
                onClick={handleAddFiveMin}
                className="pixel-btn min-h-[44px] px-2.5 sm:px-3.5 py-2.5 bg-[#FAF8F5] hover:bg-[#F2EFE9] border-2 border-[#2D3142] font-mono text-xs sm:text-sm font-bold text-[#2D3142] rounded-xs text-center"
              >
                <span className="sm:hidden">+5m</span>
                <span className="hidden sm:inline">+5 Min</span>
              </button>

              <button
                type="button"
                id="quest-skip-phase-btn"
                onClick={handleAdvancePhase}
                className="pixel-btn min-h-[44px] px-2 sm:px-4 py-2.5 bg-[#CADBFB] hover:bg-[#B4C5E4] border-2 border-[#2D3142] font-mono text-xs sm:text-sm font-bold text-[#2D3142] rounded-xs text-center"
              >
                {currentPhaseIndex < questConfig.phases.length - 1 ? (
                  <>
                    <span className="sm:hidden">Next →</span>
                    <span className="hidden sm:inline">Next Phase →</span>
                  </>
                ) : (
                  <>
                    <span className="sm:hidden">Finish</span>
                    <span className="hidden sm:inline">Finish Quest</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CLASSIC POMODORO / BOX BREATHING SCREEN (Fallback / Optional)         */}
      {/* ========================================================================= */}
      {activeMode !== 'quest' && (
        <div className="space-y-3">
          {/* Preset Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 select-none">
            {(Object.keys(CLASSIC_MODES) as (Exclude<FocusMode, 'quest'>)[]).map((mode) => {
              const preset = CLASSIC_MODES[mode];
              const isSelected = classicPreset === mode;
              return (
                <button
                  key={mode}
                  id={`focus-mode-${mode}`}
                  onClick={() => {
                    playMechanicalClick(soundEnabled);
                    setClassicPreset(mode);
                    setActiveMode(mode);
                    setIsTimerRunning(false);
                    const mins = preset.minutes;
                    setClassicTimeLeft(mins * 60);
                    setClassicTotalSeconds(mins * 60);
                  }}
                  className={`pixel-btn flex items-center justify-between p-2 sm:p-2.5 border-2 border-[#2D3142] text-left transition-all rounded-xs ${
                    isSelected
                      ? 'bg-[#CADBFB] text-[#2D3142] pixel-shadow font-bold'
                      : 'bg-[#F2EFE9] text-[#2D3142]/70 hover:bg-[#FAF8F5] pixel-shadow-sm'
                  }`}
                >
                  <div>
                    <div className="font-mono text-[11px] sm:text-xs uppercase flex items-center gap-1">
                      <span>{isSelected ? '◆' : '◇'}</span>
                      <span>{preset.label}</span>
                    </div>
                    <div className="font-mono text-[10px] sm:text-[11px] text-[#2D3142]/80 mt-0.5">
                      {preset.minutes} MINS
                    </div>
                  </div>
                  <div className="text-[#2D3142]">{preset.icon}</div>
                </button>
              );
            })}
          </div>

          {/* Classic Timer Body */}
          <div className="bg-[#FAF8F5] border-2 border-[#2D3142] p-4 sm:p-8 pixel-shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between border-b-2 border-[#2D3142]/20 pb-2 mb-4">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#7FB685] border border-[#2D3142] text-[#2D3142]">
                {CLASSIC_MODES[classicPreset].label}
              </span>
              <div className="font-mono text-xs font-bold text-[#2D3142]">
                {isTimerRunning ? 'RUNNING' : 'STANDBY'}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center my-3 select-none">
              <div className="font-mono text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight text-[#2D3142]">
                {timeFormatted}
              </div>
            </div>

            {/* Controls */}
            <div className="mt-4 grid grid-cols-3 sm:flex items-center justify-center gap-2 select-none w-full">
              <button
                onClick={handleToggleTimer}
                className={`pixel-btn min-h-[44px] px-3 sm:px-6 py-2.5 border-2 border-[#2D3142] font-mono text-xs sm:text-sm font-bold rounded-xs text-center ${
                  isTimerRunning ? 'bg-[#F8C390]' : 'bg-[#7FB685] pixel-shadow'
                }`}
              >
                <span className="sm:hidden">{isTimerRunning ? 'Pause' : 'Start'}</span>
                <span className="hidden sm:inline">{isTimerRunning ? 'Pause Sprint' : 'Start Sprint'}</span>
              </button>
              <button
                onClick={handleAddFiveMin}
                className="pixel-btn min-h-[44px] px-2 sm:px-3.5 py-2.5 bg-[#FAF8F5] hover:bg-[#F2EFE9] border-2 border-[#2D3142] font-mono text-xs font-bold rounded-xs text-center"
              >
                <span className="sm:hidden">+5m</span>
                <span className="hidden sm:inline">+5 Min</span>
              </button>
              <button
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  setIsTimerRunning(false);
                  const mins = CLASSIC_MODES[classicPreset].minutes;
                  setClassicTimeLeft(mins * 60);
                  setClassicTotalSeconds(mins * 60);
                }}
                className="pixel-btn min-h-[44px] px-2 sm:px-3.5 py-2.5 bg-[#F2EFE9] hover:bg-[#E4DFD5] border-2 border-[#2D3142] font-mono text-xs font-bold rounded-xs text-center"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CANONICAL QUEST COMPLETE! CELEBRATION MODAL                           */}
      {/* ========================================================================= */}
      {showVictoryModal && completedQuestSummary && (
        <div className="fixed inset-0 z-50 bg-[#2D3142]/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#FAF8F5] border-3 border-[#2D3142] pixel-shadow-lg p-4 sm:p-6 relative select-none">
            {/* Close Cross */}
            <button
              onClick={() => setShowVictoryModal(false)}
              className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 p-1 text-[#2D3142] hover:bg-[#E4DFD5] border border-[#2D3142] rounded-xs"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Retro Trophy Banner */}
            <div className="text-center space-y-1 mb-4">
              <div className="w-12 h-12 mx-auto bg-[#CADBFB] border-2 border-[#2D3142] rounded-full flex items-center justify-center pixel-shadow-sm">
                <Award className="w-6 h-6 text-[#2D3142]" />
              </div>
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-[#7FB685]">
                🎮 FOCUS QUEST
              </div>
              <h2 className="font-mono text-xl sm:text-2xl font-black text-[#2D3142] uppercase tracking-wide">
                QUEST COMPLETE!
              </h2>
              <p className="font-mono text-xs text-[#2D3142]/80 font-bold">
                ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
              </p>
            </div>

            {/* Exactly Specified Rewards Summary Card */}
            <div className="bg-[#EBF3EC] border-2 border-[#2D3142] p-3.5 space-y-2 mb-4 pixel-inset-soft">
              <div className="flex items-center justify-between font-mono text-sm font-bold text-[#2D3142]">
                <span className="flex items-center gap-1.5 text-[#2D3142]">
                  <Sparkles className="w-4 h-4 text-[#F4A261] fill-[#F4A261]" />
                  <span>⭐ +50 XP</span>
                </span>
                <span className="text-[11px] text-[#35693F] bg-[#FAF8F5] px-1.5 py-0.5 border border-[#2D3142] rounded-xs">
                  AWARDED
                </span>
              </div>

              <div className="flex items-center justify-between font-mono text-sm font-bold text-[#2D3142]">
                <span className="flex items-center gap-1.5 text-[#2D3142]">
                  <span>🐾 Pet happiness +10</span>
                </span>
                <span className="text-[11px] text-[#2D3142] bg-[#FAF8F5] px-1.5 py-0.5 border border-[#2D3142] rounded-xs">
                  +2 TREATS HARVESTED
                </span>
              </div>

              <div className="flex items-center justify-between font-mono text-sm font-bold text-[#2D3142]">
                <span className="flex items-center gap-1.5 text-[#2D3142]">
                  <Flame className="w-4 h-4 text-[#BA1A1A] fill-[#F4A261]" />
                  <span>🔥 Streak maintained</span>
                </span>
                <span className="text-[11px] text-[#2D3142] bg-[#FAF8F5] px-1.5 py-0.5 border border-[#2D3142] rounded-xs">
                  {streakInfo.currentStreak} DAYS
                </span>
              </div>
            </div>

            {/* Quest Stats Overview */}
            <div className="bg-[#FAF8F5] border border-[#2D3142] p-3 mb-4 space-y-1 font-mono text-xs text-[#2D3142]">
              <div className="flex justify-between">
                <span className="text-[#2D3142]/70">Quest Title:</span>
                <span className="font-bold truncate max-w-[200px]">{completedQuestSummary.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#2D3142]/70">Total Focused:</span>
                <span className="font-bold">{completedQuestSummary.minutes} Minutes</span>
              </div>
              {completedQuestSummary.subtasksTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#2D3142]/70">Subtasks:</span>
                  <span className="font-bold">
                    {completedQuestSummary.subtasksCompleted} / {completedQuestSummary.subtasksTotal} Complete
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                id="victory-feed-pet-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  onFeedBerry();
                }}
                className="flex-1 pixel-btn px-3 py-2 bg-[#F8C390] hover:bg-[#F4A261] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] text-center rounded-xs"
              >
                🍓 FEED PET WITH TREAT
              </button>

              <button
                type="button"
                id="victory-continue-btn"
                onClick={() => {
                  playMechanicalClick(soundEnabled);
                  setShowVictoryModal(false);
                }}
                className="flex-1 pixel-btn px-3 py-2 bg-[#7FB685] hover:bg-[#A3CFAB] border-2 border-[#2D3142] font-mono text-xs font-bold text-[#2D3142] text-center rounded-xs"
              >
                ⚔️ NEXT QUEST
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
