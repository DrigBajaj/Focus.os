import React, { useState, useEffect } from 'react';
import { ConsoleHeader } from './components/ConsoleHeader';
import { NavigationTabs } from './components/NavigationTabs';
import { PixelPet } from './components/PixelPet';
import { FocusScreen } from './components/FocusScreen';
import { WhatShouldIDoNow } from './components/WhatShouldIDoNow';
import { TaskPlanner } from './components/TaskPlanner';
import { RoutinesScreen } from './components/RoutinesScreen';
import { MusicController } from './components/MusicController';
import { SensoryScreen } from './components/SensoryScreen';
import { CartridgeMemoryScreen } from './components/CartridgeMemoryScreen';
import { AuthScreen } from './components/AuthScreen';
import { SettingsModal } from './components/SettingsModal';
import { ScreenTab, TaskItem, RoutineItem, DayActivity, PetState, Subtask, AuthUser, FontSettings, FocusQuestConfig } from './types';
import {
  INITIAL_TASKS,
  INITIAL_ROUTINES,
  INITIAL_WEEK_ACTIVITY,
  NEW_USER_INITIAL_TASKS,
  NEW_USER_ROUTINES,
  NEW_USER_WEEK_ACTIVITY,
} from './data/initialData';
import {
  setAmbientWhiteNoise,
  toggleRetroLofi,
  playVictoryFanfare,
  playMechanicalClick,
  playQuestComplete,
} from './utils/audio';
import { loadFontSettings, saveFontSettings, applyFontSettingsToDOM } from './utils/fontSettings';
import { getCurrentPetStage } from './data/petEvolutions';
import { calculateDailyStreak, recordStreakTargetMet } from './utils/streak';

export default function App() {
  // Active Screen Tab
  const [currentTab, setCurrentTab] = useState<ScreenTab>('whatnow');

  // Font settings
  const [fontSettings, setFontSettings] = useState<FontSettings>(() => loadFontSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [evolutionToast, setEvolutionToast] = useState<{
    title: string;
    petName: string;
    species: string;
    level: number;
  } | null>(null);
  const [streakToast, setStreakToast] = useState<{
    streak: number;
    minutes: number;
    target: number;
  } | null>(null);

  // Authenticated User & Portal state - Defaults to null to present standalone Login/Signup screen
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('cozy_pixel_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [logoutNotice, setLogoutNotice] = useState<string | null>(null);

  // Audio settings
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('cozy_pixel_sound');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [ambientNoise, setAmbientNoise] = useState<boolean>(false);
  const [isRetroLofiActive, setIsRetroLofiActive] = useState<boolean>(false);

  // Tasks & Responsibilities (Adaptive Task Matrix)
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('cozy_pixel_tasks_v2');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  // Recurring Daily Routines
  const [routines, setRoutines] = useState<RoutineItem[]>(() => {
    const saved = localStorage.getItem('cozy_pixel_routines_v2');
    return saved ? JSON.parse(saved) : INITIAL_ROUTINES;
  });

  // Currently focused task
  const [activeFocusTask, setActiveFocusTask] = useState<TaskItem | null>(() => {
    const saved = localStorage.getItem('cozy_pixel_active_task');
    return saved ? JSON.parse(saved) : INITIAL_TASKS[0];
  });

  // AI Breakdown loading state
  const [isBreakingDownId, setIsBreakingDownId] = useState<string | null>(null);

  // Focus timer running state
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // 7-day activity log
  const [activityLog, setActivityLog] = useState<DayActivity[]>(() => {
    const saved = localStorage.getItem('cozy_pixel_activity_v2');
    return saved ? JSON.parse(saved) : INITIAL_WEEK_ACTIVITY;
  });

  // Pet state with migration for species, evolutions, and work-to-feed inventory
  const [pet, setPet] = useState<PetState>(() => {
    const saved = localStorage.getItem('cozy_pixel_pet_v2');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        return {
          id: p.id || 'sprout',
          name: p.name || 'Sprout',
          level: typeof p.level === 'number' ? p.level : 2,
          exp: typeof p.exp === 'number' ? p.exp : 30,
          maxExp: p.maxExp || 100,
          mood: p.mood || 'happy',
          berriesAvailable: typeof p.berriesAvailable === 'number' ? p.berriesAvailable : Math.max(1, p.berriesFed || 2),
          berriesFed: p.berriesFed || 0,
          totalWorkExpEarned: p.totalWorkExpEarned || 0,
        };
      } catch {
        // Fallback below
      }
    }
    return {
      id: 'sprout',
      name: 'Sprout',
      level: 2,
      exp: 40,
      maxExp: 100,
      mood: 'happy',
      berriesAvailable: 2,
      berriesFed: 3,
      totalWorkExpEarned: 50,
    };
  });

  // Scratchpad
  const [scratchpad, setScratchpad] = useState<string>(() => {
    return (
      localStorage.getItem('cozy_pixel_scratchpad_v2') ||
      '• Remember to take gentle breaths.\n• You do not have to finish everything right now.\n• One small micro-step creates momentum.'
    );
  });

  // Apply and persist typography font settings
  useEffect(() => {
    applyFontSettingsToDOM(fontSettings);
    saveFontSettings(fontSettings);
  }, [fontSettings]);

  // Persistence to localStorage
  useEffect(() => {
    localStorage.setItem('cozy_pixel_sound', JSON.stringify(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('cozy_pixel_tasks_v2', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('cozy_pixel_routines_v2', JSON.stringify(routines));
  }, [routines]);

  useEffect(() => {
    localStorage.setItem('cozy_pixel_active_task', JSON.stringify(activeFocusTask));
  }, [activeFocusTask]);

  useEffect(() => {
    localStorage.setItem('cozy_pixel_activity_v2', JSON.stringify(activityLog));
  }, [activityLog]);

  useEffect(() => {
    localStorage.setItem('cozy_pixel_pet_v2', JSON.stringify(pet));
  }, [pet]);

  useEffect(() => {
    localStorage.setItem('cozy_pixel_scratchpad_v2', scratchpad);
  }, [scratchpad]);

  // Ambient rain noise handler
  const handleToggleAmbient = () => {
    const next = !ambientNoise;
    setAmbientNoise(next);
    setAmbientWhiteNoise(next);
  };

  // 8-bit lofi audio handler
  const handleToggleRetroLofi = (active: boolean) => {
    setIsRetroLofiActive(active);
    toggleRetroLofi(active);
  };

  // Complete a focus session (timer finished) -> Rewards work XP & Harvests treats into bag!
  const handleSessionComplete = (minutes: number) => {
    const treatsEarned = minutes >= 20 ? 2 : 1;
    const workXp = minutes * 2;

    setPet((prev) => {
      const expGain = workXp;
      const newExp = prev.exp + expGain;
      const nextLevel = newExp >= prev.maxExp ? prev.level + 1 : prev.level;
      const evolved = nextLevel > prev.level;

      if (evolved) {
        playVictoryFanfare(soundEnabled);
        const stage = getCurrentPetStage(prev.id, nextLevel);
        setEvolutionToast({
          title: stage.title,
          petName: prev.name,
          species: prev.id,
          level: nextLevel,
        });
        setTimeout(() => setEvolutionToast(null), 4500);
      }

      return {
        ...prev,
        level: nextLevel,
        exp: newExp >= prev.maxExp ? newExp - prev.maxExp : newExp,
        maxExp: evolved ? Math.round(prev.maxExp * 1.35) : prev.maxExp,
        mood: 'celebrating',
        berriesAvailable: prev.berriesAvailable + treatsEarned,
        totalWorkExpEarned: (prev.totalWorkExpEarned || 0) + workXp,
      };
    });

    // Update today's activity log and track daily focus target
    const dailyTarget = currentUser?.dailyGoalMinutes || 30;
    setActivityLog((prev) => {
      const copy = [...prev];
      const todayIdx = copy.length - 1;
      if (todayIdx >= 0) {
        const today = copy[todayIdx];
        const prevMins = today.minutesFocused;
        const newMins = prevMins + minutes;
        copy[todayIdx] = {
          ...today,
          minutesFocused: newMins,
          level: newMins >= 60 ? 3 : newMins >= 30 ? 2 : 1,
        };

        // If today just met or exceeded the daily focus target:
        if (prevMins < dailyTarget && newMins >= dailyTarget) {
          playVictoryFanfare(soundEnabled);
          const computed = calculateDailyStreak(copy, dailyTarget);
          recordStreakTargetMet(computed.currentStreak);
          setStreakToast({
            streak: computed.currentStreak,
            minutes: newMins,
            target: dailyTarget,
          });
          setTimeout(() => setStreakToast(null), 5000);
        }
      }
      return copy;
    });
  };

  // Complete a Focus Quest session -> Awards +50 XP, +10 Happiness (+2 treats), and Maintains Streak!
  const handleQuestComplete = (questConfig: FocusQuestConfig, minutes: number, taskId?: string) => {
    const xpReward = questConfig.xpReward || 50;
    const treatsEarned = 2; // +10 Pet Happiness gives +2 treats harvested into bag!

    setPet((prev) => {
      const newExp = prev.exp + xpReward;
      const nextLevel = newExp >= prev.maxExp ? prev.level + 1 : prev.level;
      const evolved = nextLevel > prev.level;

      if (evolved) {
        playVictoryFanfare(soundEnabled);
        const stage = getCurrentPetStage(prev.id, nextLevel);
        setEvolutionToast({
          title: stage.title,
          petName: prev.name,
          species: prev.id,
          level: nextLevel,
        });
        setTimeout(() => setEvolutionToast(null), 4500);
      }

      return {
        ...prev,
        level: nextLevel,
        exp: newExp >= prev.maxExp ? newExp - prev.maxExp : newExp,
        maxExp: evolved ? Math.round(prev.maxExp * 1.35) : prev.maxExp,
        mood: 'celebrating',
        berriesAvailable: prev.berriesAvailable + treatsEarned,
        totalWorkExpEarned: (prev.totalWorkExpEarned || 0) + xpReward,
      };
    });

    // Update today's activity log and maintain streak
    const dailyTarget = currentUser?.dailyGoalMinutes || 30;
    setActivityLog((prev) => {
      const copy = [...prev];
      const todayIdx = copy.length - 1;
      if (todayIdx >= 0) {
        const today = copy[todayIdx];
        const prevMins = today.minutesFocused;
        const newMins = prevMins + minutes;
        copy[todayIdx] = {
          ...today,
          minutesFocused: newMins,
          questsCompleted: (today.questsCompleted || 0) + 1,
          level: newMins >= 60 ? 3 : newMins >= 30 ? 2 : 1,
        };

        const computed = calculateDailyStreak(copy, dailyTarget);
        recordStreakTargetMet(computed.currentStreak);

        if (prevMins < dailyTarget && newMins >= dailyTarget) {
          playVictoryFanfare(soundEnabled);
          setStreakToast({
            streak: computed.currentStreak,
            minutes: newMins,
            target: dailyTarget,
          });
          setTimeout(() => setStreakToast(null), 5000);
        }
      }
      return copy;
    });

    // Mark task completed if specified
    if (taskId) {
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            return {
              ...t,
              completed: true,
              subtasks: t.subtasks.map((s) => ({ ...s, completed: true })),
            };
          }
          return t;
        })
      );
    }
  };

  // Start focus on a selected task
  const handleStartFocusOnTask = (task: TaskItem) => {
    setActiveFocusTask(task);
    setCurrentTab('focus');
  };

  // Toggle task complete -> Rewards work XP & Harvests 1 Treat into bag!
  const handleToggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          if (nextCompleted) {
            playQuestComplete(soundEnabled);
            const workXp = t.staminaPoints * 25;

            setPet((p) => {
              const expGain = 15;
              const newExp = p.exp + expGain;
              const nextLevel = newExp >= p.maxExp ? p.level + 1 : p.level;
              const evolved = nextLevel > p.level;

              if (evolved) {
                playVictoryFanfare(soundEnabled);
                const stage = getCurrentPetStage(p.id, nextLevel);
                setEvolutionToast({
                  title: stage.title,
                  petName: p.name,
                  species: p.id,
                  level: nextLevel,
                });
                setTimeout(() => setEvolutionToast(null), 4500);
              }

              return {
                ...p,
                exp: newExp >= p.maxExp ? newExp - p.maxExp : newExp,
                level: nextLevel,
                maxExp: evolved ? Math.round(p.maxExp * 1.35) : p.maxExp,
                berriesAvailable: p.berriesAvailable + 1, // Harvest 1 treat from finished work!
                totalWorkExpEarned: (p.totalWorkExpEarned || 0) + workXp,
              };
            });

            // Increment activity log
            setActivityLog((act) => {
              const copy = [...act];
              const todayIdx = copy.length - 1;
              if (todayIdx >= 0) {
                copy[todayIdx] = {
                  ...copy[todayIdx],
                  questsCompleted: copy[todayIdx].questsCompleted + 1,
                };
              }
              return copy;
            });
          }
          return { ...t, completed: nextCompleted };
        }
        return t;
      })
    );
  };

  // Toggle subtask complete
  const handleToggleSubtask = (taskId: string, subtaskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const updatedSubtasks = t.subtasks.map((st) => {
            if (st.id === subtaskId) {
              const nextDone = !st.completed;
              if (nextDone) {
                setPet((p) => ({
                  ...p,
                  exp: p.exp + 5,
                  totalWorkExpEarned: (p.totalWorkExpEarned || 0) + 10,
                }));
              }
              return { ...st, completed: nextDone };
            }
            return st;
          });

          // Check if all subtasks are now completed
          const allDone = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);

          return {
            ...t,
            subtasks: updatedSubtasks,
            completed: allDone ? true : t.completed,
          };
        }
        return t;
      })
    );
  };

  // Add new task
  const handleAddTask = (
    title: string,
    priority: 'urgent' | 'high' | 'normal' | 'low',
    deadline: string,
    estimatedMinutes: number,
    staminaPoints: 1 | 2 | 3,
    category: 'academic' | 'project' | 'life' | 'wellness'
  ) => {
    const newTask: TaskItem = {
      id: `task-${Date.now()}`,
      title,
      priority,
      deadline,
      estimatedMinutes,
      staminaPoints,
      completed: false,
      category,
      subtasks: [],
      createdAt: Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  // Delete task
  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    if (activeFocusTask?.id === id) {
      setActiveFocusTask(null);
    }
  };

  // AI Task Decomposition (/api/breakdown)
  const handleBreakdownTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setIsBreakingDownId(taskId);
    try {
      const res = await fetch('/api/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: task.title,
          totalMinutes: task.estimatedMinutes,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.subtasks) && data.subtasks.length > 0) {
          const generated: Subtask[] = data.subtasks.map((s: any, idx: number) => ({
            id: `sub-${Date.now()}-${idx}`,
            title: s.title,
            estimatedMinutes: s.estimatedMinutes || 10,
            staminaPoints: s.staminaPoints || 1,
            completed: false,
          }));

          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, subtasks: generated } : t))
          );
          if (activeFocusTask?.id === taskId) {
            setActiveFocusTask((prev) => (prev ? { ...prev, subtasks: generated } : null));
          }
          playVictoryFanfare(soundEnabled);
        }
      }
    } catch (err) {
      console.error('Task breakdown error:', err);
    } finally {
      setIsBreakingDownId(null);
    }
  };

  // Toggle routine -> Rewards work XP & Harvests 1 Treat into bag!
  const handleToggleRoutine = (id: string) => {
    setRoutines((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextDone = !r.completedToday;
          if (nextDone) {
            playQuestComplete(soundEnabled);
            setPet((p) => ({
              ...p,
              exp: p.exp + r.staminaReward * 10,
              berriesAvailable: p.berriesAvailable + 1, // Routine rewards 1 treat in bag!
              totalWorkExpEarned: (p.totalWorkExpEarned || 0) + r.staminaReward * 20,
            }));
          }
          return {
            ...r,
            completedToday: nextDone,
            streak: nextDone ? r.streak + 1 : Math.max(0, r.streak - 1),
          };
        }
        return r;
      })
    );
  };

  // Add routine
  const handleAddRoutine = (title: string, timeOfDay: 'morning' | 'afternoon' | 'evening') => {
    const newR: RoutineItem = {
      id: `rt-${Date.now()}`,
      title,
      timeOfDay,
      iconName: 'sparkles',
      streak: 1,
      completedToday: false,
      staminaReward: 1,
    };
    setRoutines((prev) => [...prev, newR]);
  };

  // Feed treat to pet - ONLY works when user has earned treats from work!
  const handleFeedBerry = () => {
    setPet((prev) => {
      if (prev.berriesAvailable <= 0) {
        return prev;
      }
      const newExp = prev.exp + 30; // Feeding gives high pet growth XP
      const nextLevel = newExp >= prev.maxExp ? prev.level + 1 : prev.level;
      const evolved = nextLevel > prev.level;

      if (evolved) {
        playVictoryFanfare(soundEnabled);
        const stage = getCurrentPetStage(prev.id, nextLevel);
        setEvolutionToast({
          title: stage.title,
          petName: prev.name,
          species: prev.id,
          level: nextLevel,
        });
        setTimeout(() => setEvolutionToast(null), 4500);
      }

      return {
        ...prev,
        level: nextLevel,
        exp: newExp >= prev.maxExp ? newExp - prev.maxExp : newExp,
        maxExp: evolved ? Math.round(prev.maxExp * 1.35) : prev.maxExp,
        berriesAvailable: prev.berriesAvailable - 1,
        berriesFed: prev.berriesFed + 1,
        mood: 'happy',
      };
    });
  };

  // Reset data to defaults
  const handleResetData = () => {
    localStorage.clear();
    setTasks(INITIAL_TASKS);
    setRoutines(INITIAL_ROUTINES);
    setActiveFocusTask(INITIAL_TASKS[0]);
    setActivityLog(INITIAL_WEEK_ACTIVITY);
    setPet({
      id: 'sprout',
      name: 'Sprout',
      level: 1,
      exp: 0,
      maxExp: 100,
      mood: 'happy',
      berriesAvailable: 2,
      berriesFed: 0,
      totalWorkExpEarned: 0,
    });
    setScratchpad('• Take gentle breaths.\n• You do not have to do everything at once.');
  };

  // User Authentication Handlers
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Offline fallback
    }
    localStorage.removeItem('cozy_pixel_current_user');
    setCurrentUser(null);
    setLogoutNotice('Cartridge ejected safely! Your progress has been safely stored in memory.');
    playMechanicalClick(soundEnabled);
  };

  const handleLoginSuccess = (user: AuthUser, isNewUser: boolean) => {
    setCurrentUser(user);
    localStorage.setItem('cozy_pixel_current_user', JSON.stringify(user));
    setLogoutNotice(null);

    // If new user, demo fresh user (usr-demo-0), or standard student starting fresh:
    if (isNewUser || user.id === 'usr-demo-0' || user.username === 'taylor' || user.username === 'student') {
      // Initialize welcoming Level 0 starter cartridge
      setTasks(NEW_USER_INITIAL_TASKS);
      setActiveFocusTask(NEW_USER_INITIAL_TASKS[0]);
      setRoutines(NEW_USER_ROUTINES);
      setActivityLog(NEW_USER_WEEK_ACTIVITY);
      setPet({
        id: 'sprout',
        name: 'Sprout',
        level: 0,
        exp: 0,
        maxExp: 30,
        mood: 'sleeping',
        berriesAvailable: 1,
        berriesFed: 0,
        totalWorkExpEarned: 0,
      });
      setScratchpad(
        `• Welcome to focus.os, ${user.name}!\n• Academic focus: ${user.studyMajor || 'Your studies'}\n• Daily Target: ${user.dailyGoalMinutes || 30} minutes\n• Level 0 Cartridge initialized. Take your first gentle 5-minute study sprint to awaken Sprout!`
      );
      setCurrentTab('whatnow');
    }
  };

  // If user is not authenticated, show ONLY the standalone Login/Signup page
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-[#2D3142] flex flex-col font-sans selection:bg-[#B4C5E4]">
        <AuthScreen
          onLoginSuccess={handleLoginSuccess}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          logoutNotice={logoutNotice}
        />
      </div>
    );
  }

  const activeTasksCount = tasks.filter((t) => !t.completed).length;
  const dailyTargetMinutes = currentUser?.dailyGoalMinutes || 30;
  const streakInfo = calculateDailyStreak(activityLog, dailyTargetMinutes);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2D3142] flex flex-col font-sans selection:bg-[#B4C5E4]">
      {/* Handheld Console Chassis Bezel Outer Shell */}
      <div className="flex-1 flex flex-col">
        {/* Top Hardware Bezel Header */}
        <ConsoleHeader
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          ambientNoise={ambientNoise}
          onToggleAmbient={handleToggleAmbient}
          currentUser={currentUser}
          onOpenAuth={handleLogout}
          onLogout={handleLogout}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Floating Pet Evolution Notification Toast */}
        {evolutionToast && (
          <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-50 p-3.5 bg-[#FAF8F5] border-3 border-[#2D3142] rounded-xl pixel-shadow-lg animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F8C390] border-2 border-[#2D3142] flex items-center justify-center text-xl shrink-0 animate-bounce">
                ✨
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-[#35693F] uppercase tracking-wider">
                    COMPANION EVOLUTION!
                  </span>
                  <span className="font-mono text-[9px] px-1 bg-[#7FB685] border border-[#2D3142] text-[#2D3142] rounded-xs font-bold">
                    LVL {evolutionToast.level}
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-[#2D3142] truncate mt-0.5">
                  {evolutionToast.petName} grew into {evolutionToast.title}!
                </div>
                <div className="font-sans text-[11px] text-[#2D3142]/75">
                  A glorious new form unlocked through your focused work!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Daily Streak Target Achievement Toast */}
        {streakToast && (
          <div className="fixed top-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-50 p-3.5 bg-[#FAF8F5] border-3 border-[#2D3142] rounded-xl pixel-shadow-lg animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F4A261] border-2 border-[#2D3142] flex items-center justify-center text-xl shrink-0 animate-bounce">
                🔥
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-[#8E4E14] uppercase tracking-wider">
                    DAILY TARGET ACHIEVED!
                  </span>
                  <span className="font-mono text-[9px] px-1.5 py-0.2 bg-[#7FB685] border border-[#2D3142] text-[#2D3142] rounded-xs font-bold">
                    {streakToast.streak}-DAY STREAK
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-[#2D3142] truncate mt-0.5">
                  Daily focus goal achieved ({streakToast.minutes}/{streakToast.target}m)!
                </div>
                <div className="font-sans text-[11px] text-[#2D3142]/75">
                  Your daily focus streak is now extended to {streakToast.streak} consecutive days!
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Console Main Body Area */}
        <main className="flex-1 max-w-5xl w-full mx-auto px-2.5 sm:px-6 py-2.5 sm:py-4 pb-28 md:pb-8 flex flex-col space-y-3 sm:space-y-4">
          {/* Navigation Tabs (Top bar on desktop, bottom docked bar on mobile) */}
          <NavigationTabs
            currentTab={currentTab}
            onSelectTab={(tab) => setCurrentTab(tab)}
            soundEnabled={soundEnabled}
            activeTasksCount={activeTasksCount}
            isTimerRunning={isTimerRunning}
            ambientNoise={ambientNoise}
            onToggleAmbient={handleToggleAmbient}
            onToggleSound={() => setSoundEnabled((prev) => !prev)}
            currentUser={currentUser}
            onOpenAuth={() => setCurrentUser(null)}
            onLogout={handleLogout}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {/* Virtual Companion Pet - Shown on other tabs; hidden on Focus tab where the interactive Focus Quest Pet takes center stage */}
          {currentTab !== 'focus' && (
            <PixelPet
              pet={pet}
              onFeedBerry={handleFeedBerry}
              onOpenPetSettings={() => setIsSettingsOpen(true)}
              soundEnabled={soundEnabled}
              isFocusActive={isTimerRunning}
              streakInfo={streakInfo}
            />
          )}

          {/* Active Screen Display Area */}
          <div className="w-full transition-all">
            {/* Screen 1: Focus Engine & Objective */}
            {currentTab === 'focus' && (
              <FocusScreen
                soundEnabled={soundEnabled}
                onSessionComplete={handleSessionComplete}
                onQuestComplete={handleQuestComplete}
                isTimerRunning={isTimerRunning}
                setIsTimerRunning={setIsTimerRunning}
                activeTask={activeFocusTask}
                tasks={tasks}
                onSelectActiveTask={(task) => setActiveFocusTask(task)}
                onClearActiveTask={() => setActiveFocusTask(null)}
                onToggleSubtask={handleToggleSubtask}
                onCompleteTask={handleToggleTask}
                pet={pet}
                onFeedBerry={handleFeedBerry}
                streakInfo={streakInfo}
                ambientNoise={ambientNoise}
                onToggleAmbient={handleToggleAmbient}
                isRetroLofiActive={isRetroLofiActive}
                onToggleRetroLofi={handleToggleRetroLofi}
                onOpenMusicTab={() => setCurrentTab('music')}
              />
            )}

            {/* Screen 2: "What Should I Do Now?" Adaptive Prioritization Recommender */}
            {currentTab === 'whatnow' && (
              <WhatShouldIDoNow
                tasks={tasks}
                onStartFocusOnTask={handleStartFocusOnTask}
                onBreakdownTask={handleBreakdownTask}
                soundEnabled={soundEnabled}
              />
            )}

            {/* Screen 3: Adaptive Task Planner & AI Breakdown */}
            {currentTab === 'planner' && (
              <TaskPlanner
                tasks={tasks}
                onToggleTask={handleToggleTask}
                onToggleSubtask={handleToggleSubtask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onBreakdownTask={handleBreakdownTask}
                onStartFocusOnTask={handleStartFocusOnTask}
                soundEnabled={soundEnabled}
                isBreakingDownId={isBreakingDownId}
              />
            )}

            {/* Screen 4: Recurring Routines & Habit Tracker */}
            {currentTab === 'routines' && (
              <RoutinesScreen
                routines={routines}
                onToggleRoutine={handleToggleRoutine}
                onAddRoutine={handleAddRoutine}
                soundEnabled={soundEnabled}
              />
            )}

            {/* Screen 5: Spotify & Apple Music Controller */}
            {currentTab === 'music' && (
              <MusicController
                soundEnabled={soundEnabled}
                isRetroLofiActive={isRetroLofiActive}
                onToggleRetroLofi={handleToggleRetroLofi}
              />
            )}

            {/* Screen 6: Sensory Calm, Breath Pacer & Grounding */}
            {currentTab === 'sensory' && (
              <SensoryScreen
                soundEnabled={soundEnabled}
                ambientNoise={ambientNoise}
                onToggleAmbient={handleToggleAmbient}
                isRetroLofiActive={isRetroLofiActive}
                onToggleRetroLofi={handleToggleRetroLofi}
                onNavigateToMusic={() => setCurrentTab('music')}
              />
            )}

            {/* Screen 7: Memory Cartridge, Activity Heatmap & Brain Dump */}
            {currentTab === 'cartridge' && (
              <CartridgeMemoryScreen
                activityLog={activityLog}
                pet={pet}
                scratchpad={scratchpad}
                onUpdateScratchpad={setScratchpad}
                soundEnabled={soundEnabled}
                onResetData={handleResetData}
                currentUser={currentUser}
                onLogout={handleLogout}
                onSwitchAccount={handleLogout}
                onOpenSettings={() => setIsSettingsOpen(true)}
                streakInfo={streakInfo}
              />
            )}
          </div>
        </main>

        {/* Global Settings & Font Configuration Modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          fontSettings={fontSettings}
          onUpdateFontSettings={setFontSettings}
          pet={pet}
          onUpdatePet={(updated) => setPet((prev) => ({ ...prev, ...updated }))}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled((prev) => !prev)}
          ambientNoise={ambientNoise}
          onToggleAmbient={handleToggleAmbient}
        />
      </div>
    </div>
  );
}
