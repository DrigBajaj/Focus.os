
import { DayActivity } from '../types';

export interface StreakInfo {
  currentStreak: number;
  isTodayTargetMet: boolean;
  todayMinutes: number;
  targetMinutes: number;
  minutesRemaining: number;
  streakDays: boolean[];
}

// Each account gets separate browser storage.
const getStreakKey = (userId: string) =>
  `cozy_pocket_daily_streak_count_${userId}`;

const getLastDateKey = (userId: string) =>
  `cozy_pocket_streak_last_achieved_date_${userId}`;

export function calculateDailyStreak(
  activityLog: DayActivity[],
  userId: string,
  targetMinutes: number = 30
): StreakInfo {
  const todayIdx = activityLog.length - 1;

  const today =
    todayIdx >= 0
      ? activityLog[todayIdx]
      : {
          minutesFocused: 0,
          date: 'Today',
          questsCompleted: 0,
          level: 0,
        };

  const todayMinutes = today.minutesFocused;
  const isTodayTargetMet = todayMinutes >= targetMinutes;
  const minutesRemaining = Math.max(
    0,
    targetMinutes - todayMinutes
  );

  // Calculate the streak from the activity history.
  let streakFromLog = 0;

  if (todayIdx >= 0) {
    if (isTodayTargetMet) {
      streakFromLog = 1;

      // Count consecutive successful days before today.
      for (let i = todayIdx - 1; i >= 0; i--) {
        if (activityLog[i].minutesFocused >= targetMinutes) {
          streakFromLog++;
        } else {
          break;
        }
      }
    } else {
      // Today is not complete yet, so check from yesterday.
      for (let i = todayIdx - 1; i >= 0; i--) {
        if (activityLog[i].minutesFocused >= targetMinutes) {
          streakFromLog++;
        } else {
          break;
        }
      }
    }
  }

  // Read only this user's stored streak.
  let storedStreak = 0;

  try {
    const raw = localStorage.getItem(getStreakKey(userId));

    if (raw !== null) {
      storedStreak = Math.max(0, parseInt(raw, 10) || 0);
    }
  } catch {
    // Continue using activity history if storage is unavailable.
  }

  // No artificial fallback: a genuinely new account starts at zero.
  const effectiveStreak = Math.max(
    streakFromLog,
    storedStreak
  );

  const streakDays = activityLog.map(
    (day) => day.minutesFocused >= targetMinutes
  );

  return {
    currentStreak: effectiveStreak,
    isTodayTargetMet,
    todayMinutes,
    targetMinutes,
    minutesRemaining,
    streakDays,
  };
}

export function recordStreakTargetMet(
  newStreak: number,
  userId: string
): void {
  try {
    const todayStr = new Date().toISOString().split('T')[0];

    localStorage.setItem(
      getStreakKey(userId),
      Math.max(0, newStreak).toString()
    );

    localStorage.setItem(
      getLastDateKey(userId),
      todayStr
    );
  } catch {
    // Ignore storage errors.
  }
}
