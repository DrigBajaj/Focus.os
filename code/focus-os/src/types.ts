export type ScreenTab =
  | 'focus'
  | 'whatnow'
  | 'planner'
  | 'routines'
  | 'music'
  | 'sensory'
  | 'cartridge';

export type FocusMode = 'quest' | 'deep' | 'sprint' | 'breathe' | 'rest';

export type QuestDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Epic';

export interface QuestPhase {
  id: string;
  type: 'focus' | 'break';
  label: string;
  minutes: number;
}

export interface FocusQuestConfig {
  id: string;
  taskId?: string;
  title: string;
  estimatedMinutes: number;
  difficulty: QuestDifficulty;
  goalDescription: string;
  phases: QuestPhase[];
  xpReward: number;
  petHappinessReward: number;
}

export interface Subtask {
  id: string;
  title: string;
  estimatedMinutes: number;
  staminaPoints: 1 | 2 | 3;
  completed: boolean;
}

export type TaskStatus = 'pending' | 'in_progress' | 'interrupted' | 'postponed' | 'completed';

export interface TaskItem {
  id: string;
  title: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  deadline: string;
  estimatedMinutes: number;
  remainingMinutes?: number; // Dynamic remaining duration when interrupted or updated
  staminaPoints: 1 | 2 | 3;
  completed: boolean;
  category: 'academic' | 'project' | 'life' | 'wellness';
  subtasks: Subtask[];
  notes?: string;
  createdAt: number;
  status?: TaskStatus;
  postponeCount?: number;
  lastPostponedAt?: number;
  interruptedAt?: number;
  actualMinutesSpent?: number;
  lastInterruptionElapsed?: number;
}

export type ScheduleChangeEventType =
  | 'initial'
  | 'time_changed'
  | 'energy_changed'
  | 'task_postponed'
  | 'task_interrupted'
  | 'task_overrun'
  | 'task_completed'
  | 'task_added'
  | 'task_uncompleted'
  | 'task_deleted'
  | 'manual_override';

export interface ScheduleChangeEvent {
  type: ScheduleChangeEventType;
  timestamp: number;
  description: string;
  taskId?: string;
  taskTitle?: string;
  previousMinutes?: number;
  newMinutes?: number;
}

export interface ScoredTask {
  task: TaskItem;
  score: number;
  effectiveRemainingMinutes: number;
  isOverdue: boolean;
  isApproaching: boolean;
  isUrgentOrOverdue: boolean;
  fitsTimeBudget: boolean;
  fitRatio: number;
  reasons: string[];
  primaryExplanation: string;
  rankChangeNote?: string;
}

export interface ScheduleCalculationResult {
  recommendedTask: ScoredTask | null;
  rankedTasks: ScoredTask[];
  allPendingCount: number;
  availableMinutes: number;
  recalculationReason: string;
  eventDescription: string;
  timestamp: number;
}

export interface RoutineItem {
  id: string;
  title: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  iconName: string;
  streak: number;
  completedToday: boolean;
  staminaReward: number;
}

export interface DayActivity {
  date: string;
  minutesFocused: number;
  questsCompleted: number;
  level: 0 | 1 | 2 | 3;
}

export interface StreakInfo {
  currentStreak: number;
  isTodayTargetMet: boolean;
  todayMinutes: number;
  targetMinutes: number;
  minutesRemaining: number;
  streakDays: boolean[];
}

export type PetSpecies = 'sprout' | 'ember' | 'bubbles' | 'pip' | 'mochi';

export interface PetEvolutionStage {
  stage: number;
  title: string;
  name: string;
  desc: string;
  unlockLevel: number;
}

export interface PetState {
  id: PetSpecies;
  name: string;
  level: number;
  exp: number;
  maxExp: number;
  mood: 'happy' | 'focusing' | 'sleeping' | 'celebrating' | 'hungry';
  berriesAvailable: number;
  berriesFed: number;
  totalWorkExpEarned?: number;
}

export type FontFamilyOption = 'default' | 'mono' | 'lexend' | 'arcade' | 'dyslexic';
export type FontSizeOption = 'compact' | 'standard' | 'large' | 'extralarge';

export interface FontSettings {
  family: FontFamilyOption;
  size: FontSizeOption;
  increasedSpacing: boolean;
}

export interface MusicStation {
  id: string;
  name: string;
  service: 'spotify' | 'applemusic' | 'retro_lofi';
  type: 'embed' | 'stream';
  embedSrc: string;
  curator: string;
  tag: string;
}

export interface MusicPlayerState {
  service: 'spotify' | 'applemusic' | 'retro_lofi';
  activeStationId: string;
  customUrl: string;
  isPlaying: boolean;
  volume: number;
  retroTrackIndex: number;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  studyMajor?: string;
  dailyGoalMinutes?: number;
  createdAt: number;
}

