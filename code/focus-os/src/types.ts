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

export interface TaskItem {
  id: string;
  title: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  deadline: string;
  estimatedMinutes: number;
  staminaPoints: 1 | 2 | 3;
  completed: boolean;
  category: 'academic' | 'project' | 'life' | 'wellness';
  subtasks: Subtask[];
  notes?: string;
  createdAt: number;
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

