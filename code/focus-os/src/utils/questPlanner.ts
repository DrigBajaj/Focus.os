import { TaskItem, QuestDifficulty, QuestPhase, FocusQuestConfig } from '../types';

/**
 * Calculates adaptive phases for a given duration.
 * Example for 45 min: 25 min Focus → 5 min Break → 20 min Focus
 */
export function generateAdaptivePhases(estimatedMinutes: number): QuestPhase[] {
  const total = Math.max(5, estimatedMinutes);

  if (total <= 20) {
    return [
      { id: 'p-1', type: 'focus', label: 'Sprint', minutes: total },
    ];
  }

  if (total <= 30) {
    if (total === 25) {
      return [
        { id: 'p-1', type: 'focus', label: 'Deep Focus Sprint', minutes: 25 },
      ];
    }
    const focusTime = total - 5;
    return [
      { id: 'p-1', type: 'focus', label: 'Focus Sprint', minutes: focusTime },
      { id: 'p-2', type: 'break', label: 'Quick Rest', minutes: 5 },
    ];
  }

  if (total === 45) {
    // Exact user canonical example
    return [
      { id: 'p-1', type: 'focus', label: 'Focus Sprint 1', minutes: 25 },
      { id: 'p-2', type: 'break', label: 'Recharge Break', minutes: 5 },
      { id: 'p-3', type: 'focus', label: 'Focus Sprint 2', minutes: 20 },
    ];
  }

  if (total <= 50) {
    const focus1 = 25;
    const breakTime = 5;
    const focus2 = total - (focus1 + breakTime);
    return [
      { id: 'p-1', type: 'focus', label: 'Focus Sprint 1', minutes: focus1 },
      { id: 'p-2', type: 'break', label: 'Recharge Break', minutes: breakTime },
      { id: 'p-3', type: 'focus', label: 'Focus Sprint 2', minutes: Math.max(5, focus2) },
    ];
  }

  if (total <= 65) {
    return [
      { id: 'p-1', type: 'focus', label: 'Focus Block 1', minutes: 25 },
      { id: 'p-2', type: 'break', label: 'Hydrate & Stretch', minutes: 5 },
      { id: 'p-3', type: 'focus', label: 'Focus Block 2', minutes: 25 },
    ];
  }

  // 70+ mins
  return [
    { id: 'p-1', type: 'focus', label: 'Focus Block 1', minutes: 25 },
    { id: 'p-2', type: 'break', label: 'Rest Break', minutes: 5 },
    { id: 'p-3', type: 'focus', label: 'Focus Block 2', minutes: 25 },
    { id: 'p-4', type: 'break', label: 'Mind Reset', minutes: 5 },
    { id: 'p-5', type: 'focus', label: 'Final Sprint', minutes: Math.min(25, total - 60) },
  ];
}

export function calculateQuestDifficulty(estimatedMinutes: number, staminaPoints?: number): QuestDifficulty {
  if (staminaPoints === 3 || estimatedMinutes >= 60) return 'Hard';
  if (staminaPoints === 1 && estimatedMinutes <= 20) return 'Easy';
  if (estimatedMinutes > 75) return 'Epic';
  return 'Medium';
}

export function buildQuestFromTask(task: TaskItem): FocusQuestConfig {
  const estimated = task.estimatedMinutes || 45;
  const difficulty = calculateQuestDifficulty(estimated, task.staminaPoints);
  const phases = generateAdaptivePhases(estimated);

  let goalDescription = 'Conquer task objectives';
  if (task.subtasks.length > 0) {
    const remainingSubtasks = task.subtasks.filter((s) => !s.completed).length;
    const count = remainingSubtasks > 0 ? remainingSubtasks : task.subtasks.length;
    goalDescription = `Complete ${count} subtask${count > 1 ? 's' : ''}`;
  }

  return {
    id: `quest-${task.id}-${Date.now()}`,
    taskId: task.id,
    title: task.title,
    estimatedMinutes: estimated,
    difficulty,
    goalDescription,
    phases,
    xpReward: 50,
    petHappinessReward: 10,
  };
}
