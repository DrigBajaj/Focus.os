import {
  TaskItem,
  ScoredTask,
  ScheduleChangeEvent,
  ScheduleCalculationResult,
} from '../types';

/**
 * Adaptive Scheduling Engine for FOCUS.OS
 * 
 * Deterministic, explainable scoring engine that dynamically ranks pending tasks
 * based on urgency, priority, remaining duration, user available time window,
 * energy level, and schedule disruption events (postponements, interruptions, overruns).
 */

export interface SchedulerOptions {
  availableMinutes: number;
  energyLevel?: 'low' | 'med' | 'high';
  lastEvent?: ScheduleChangeEvent | null;
  previousTopTaskId?: string | null;
}

/**
 * Parses a natural language or date string deadline into remaining hours and urgency metadata.
 * Handles formats like: "Overdue", "Yesterday", "Today", "Tomorrow 5 PM", "Friday", ISO dates, etc.
 */
export function parseDeadlineToUrgency(deadlineStr: string | undefined): {
  isOverdue: boolean;
  isApproaching: boolean;
  urgencyLabel: string;
  score: number;
  explanation: string;
} {
  if (!deadlineStr || typeof deadlineStr !== 'string' || !deadlineStr.trim()) {
    return {
      isOverdue: false,
      isApproaching: false,
      urgencyLabel: 'No deadline',
      score: 5,
      explanation: 'No immediate deadline specified',
    };
  }

  const raw = deadlineStr.trim().toLowerCase();

  // 1. Explicit overdue signals
  if (
    raw.includes('overdue') ||
    raw.includes('past due') ||
    raw.includes('yesterday') ||
    raw.includes('late')
  ) {
    return {
      isOverdue: true,
      isApproaching: true,
      urgencyLabel: 'Overdue',
      score: 60,
      explanation: `Overdue deadline (${deadlineStr}) requires urgent attention`,
    };
  }

  // 2. Urgent / Today / Within hours
  if (
    raw.includes('today') ||
    raw.includes('tonight') ||
    raw.includes('now') ||
    raw.includes('1 hour') ||
    raw.includes('2 hour') ||
    raw.includes('3 hour') ||
    raw.includes('few hours')
  ) {
    return {
      isOverdue: false,
      isApproaching: true,
      urgencyLabel: 'Due Today',
      score: 45,
      explanation: `Pressing deadline today (${deadlineStr})`,
    };
  }

  // 3. Tomorrow / Within 24-48 hours
  if (raw.includes('tomorrow') || raw.includes('in 1 day') || raw.includes('24h')) {
    return {
      isOverdue: false,
      isApproaching: true,
      urgencyLabel: 'Due Tomorrow',
      score: 30,
      explanation: `Approaching deadline tomorrow (${deadlineStr})`,
    };
  }

  // 4. In a few days (e.g. "in 2 days", "in 3 days", "friday", "this weekend")
  if (
    raw.includes('in 2 days') ||
    raw.includes('in 3 days') ||
    raw.includes('friday') ||
    raw.includes('thursday') ||
    raw.includes('weekend') ||
    raw.includes('this week')
  ) {
    return {
      isOverdue: false,
      isApproaching: false,
      urgencyLabel: 'Upcoming this week',
      score: 18,
      explanation: `Upcoming deadline (${deadlineStr})`,
    };
  }

  // 5. Try parsing as standard date
  const parsedDate = Date.parse(deadlineStr);
  if (!isNaN(parsedDate)) {
    const diffHours = (parsedDate - Date.now()) / (1000 * 60 * 60);
    if (diffHours < 0) {
      return {
        isOverdue: true,
        isApproaching: true,
        urgencyLabel: 'Overdue',
        score: 60,
        explanation: `Deadline passed (${deadlineStr})`,
      };
    } else if (diffHours <= 14) {
      return {
        isOverdue: false,
        isApproaching: true,
        urgencyLabel: 'Due within 14h',
        score: 45,
        explanation: `Deadline due today within ~${Math.round(diffHours)}h`,
      };
    } else if (diffHours <= 36) {
      return {
        isOverdue: false,
        isApproaching: true,
        urgencyLabel: 'Due within 36h',
        score: 30,
        explanation: `Deadline due tomorrow within ~${Math.round(diffHours)}h`,
      };
    } else if (diffHours <= 96) {
      return {
        isOverdue: false,
        isApproaching: false,
        urgencyLabel: 'Due this week',
        score: 18,
        explanation: `Deadline in ~${Math.round(diffHours / 24)} days`,
      };
    } else {
      return {
        isOverdue: false,
        isApproaching: false,
        urgencyLabel: 'Future deadline',
        score: 8,
        explanation: `Long-term deadline (${deadlineStr})`,
      };
    }
  }

  // Fallback for general text
  return {
    isOverdue: false,
    isApproaching: false,
    urgencyLabel: 'Standard timeline',
    score: 12,
    explanation: `Scheduled deadline: ${deadlineStr}`,
  };
}

/**
 * Calculates priority score
 */
export function calculatePriorityScore(priority: TaskItem['priority']): {
  score: number;
  explanation: string;
} {
  switch (priority) {
    case 'urgent':
      return { score: 50, explanation: 'Marked as urgent priority' };
    case 'high':
      return { score: 35, explanation: 'High priority commitment' };
    case 'normal':
      return { score: 20, explanation: 'Standard priority task' };
    case 'low':
      return { score: 10, explanation: 'Low priority backlog item' };
    default:
      return { score: 15, explanation: 'Default priority' };
  }
}

/**
 * Calculates time fit score based on remaining work and user's available time.
 * Handles edge cases like 0 available time, negative durations, and overrun tasks.
 */
export function calculateTimeFitScore(
  effectiveRemainingMinutes: number,
  availableMinutes: number,
  isUrgentOrOverdue: boolean
): {
  score: number;
  fitsTimeBudget: boolean;
  fitRatio: number;
  explanation: string;
} {
  // Edge case: No available time window or non-positive
  if (availableMinutes <= 0) {
    return {
      score: -20,
      fitsTimeBudget: false,
      fitRatio: Infinity,
      explanation: `No available time allocated right now (${availableMinutes}m)`,
    };
  }

  const duration = Math.max(1, effectiveRemainingMinutes);
  const fitRatio = duration / availableMinutes;

  // Case 1: Fits comfortably within available time
  if (duration <= availableMinutes) {
    const timeDiff = availableMinutes - duration;
    // Perfect match receives maximum score, small tasks receive slight discount to encourage full utilization
    const bonus = 30 - Math.min(20, timeDiff * 0.4);

    // Extra micro-task bonus if available time is very short (<= 20m) and task is quick
    const quickWinBonus = availableMinutes <= 20 && duration <= 15 ? 8 : 0;

    return {
      score: bonus + quickWinBonus,
      fitsTimeBudget: true,
      fitRatio,
      explanation:
        quickWinBonus > 0
          ? `Quick win (~${duration}m) that easily fits your short ${availableMinutes}m window`
          : `Fits comfortably within your ${availableMinutes}m window (~${duration}m needed)`,
    };
  }

  // Case 2: Exceeds available time
  // If urgent or overdue, allow with modest penalty so user can make progress
  if (isUrgentOrOverdue) {
    return {
      score: -12,
      fitsTimeBudget: false,
      fitRatio,
      explanation: `Requires ~${duration}m (exceeds ${availableMinutes}m window), but high urgency justifies starting a sprint`,
    };
  }

  // Normal / low priority that exceeds available time: substantial penalty to surface achievable tasks
  const excessRatio = fitRatio - 1; // e.g. 1.5 -> 0.5 excess
  const penalty = Math.min(55, 30 + excessRatio * 20);

  return {
    score: -penalty,
    fitsTimeBudget: false,
    fitRatio,
    explanation: `Requires ~${duration}m, which exceeds your ${availableMinutes}m window — deprioritized for achievable tasks`,
  };
}

/**
 * Calculates postponement penalty.
 * Deprioritizes postponed tasks so alternative candidates can surface,
 * while scaling with repeated postponements.
 */
export function calculatePostponeImpact(
  postponeCount: number | undefined,
  lastPostponedAt: number | undefined
): {
  penalty: number;
  explanation: string | null;
} {
  const count = postponeCount || 0;
  if (count <= 0) {
    return { penalty: 0, explanation: null };
  }

  // Each postponement reduces score, capped to prevent infinite demotion
  const penalty = Math.min(50, count * 18);
  return {
    penalty,
    explanation:
      count === 1
        ? 'Temporarily demoted after being postponed'
        : `Postponed ${count} times; deprioritized to let alternatives proceed`,
  };
}

/**
 * Calculates interruption bonus or recovery factor.
 * When a task was interrupted, the remaining duration is preserved.
 * If it fits the available time, resuming it reduces task initiation friction.
 */
export function calculateInterruptionImpact(
  status: TaskItem['status'],
  effectiveRemainingMinutes: number,
  availableMinutes: number
): {
  score: number;
  explanation: string | null;
} {
  if (status !== 'interrupted') {
    return { score: 0, explanation: null };
  }

  // If the remaining portion fits the available window, prioritize resuming!
  if (availableMinutes > 0 && effectiveRemainingMinutes <= availableMinutes) {
    return {
      score: 18,
      explanation: `In-progress work already begun (~${effectiveRemainingMinutes}m left to finish) — low resumption friction`,
    };
  }

  return {
    score: 8,
    explanation: `Previously interrupted task with ~${effectiveRemainingMinutes}m remaining`,
  };
}

/**
 * Calculates energy level matching
 */
export function calculateEnergyScore(
  staminaPoints: 1 | 2 | 3,
  energyLevel?: 'low' | 'med' | 'high'
): {
  score: number;
  explanation: string | null;
} {
  if (!energyLevel) return { score: 0, explanation: null };

  const staminaMap = { low: 1, med: 2, high: 3 };
  const targetStamina = staminaMap[energyLevel];

  if (staminaPoints === targetStamina) {
    return {
      score: 15,
      explanation: `Matches your current ${energyLevel.toUpperCase()} energy level (${staminaPoints} SP)`,
    };
  }

  if (energyLevel === 'low' && staminaPoints === 3) {
    return {
      score: -20,
      explanation: `High mental effort (3 SP) when your energy is low — lower priority`,
    };
  }

  if (energyLevel === 'high' && staminaPoints === 3) {
    return {
      score: 12,
      explanation: `Great opportunity to tackle high-focus (3 SP) challenge while energetic`,
    };
  }

  return { score: 0, explanation: null };
}

/**
 * Generates a concise, readable primary explanation for the task recommendation
 */
export function generatePrimaryExplanation(
  task: TaskItem,
  scored: {
    isOverdue: boolean;
    isApproaching: boolean;
    fitsTimeBudget: boolean;
    effectiveRemainingMinutes: number;
    score: number;
    priority: TaskItem['priority'];
    status: TaskItem['status'];
    postponeCount?: number;
  },
  availableMinutes: number,
  lastEvent?: ScheduleChangeEvent | null,
  isTopRecommendation?: boolean
): string {
  // Context-specific explanation based on recent event
  if (lastEvent && isTopRecommendation) {
    if (lastEvent.type === 'task_postponed' && lastEvent.taskId !== task.id) {
      return `Promoted to top recommendation after "${lastEvent.taskTitle || 'previous task'}" was postponed.`;
    }
    if (lastEvent.type === 'time_changed') {
      if (scored.fitsTimeBudget) {
        return `Selected because it fits your updated ${availableMinutes}m window (~${scored.effectiveRemainingMinutes}m remaining).`;
      } else {
        return `Top priority task despite exceeding your updated ${availableMinutes}m window.`;
      }
    }
    if (lastEvent.type === 'task_interrupted' && lastEvent.taskId === task.id) {
      return `Ready to resume with ${scored.effectiveRemainingMinutes}m remaining work.`;
    }
    if (lastEvent.type === 'task_added' && lastEvent.taskId === task.id) {
      return `New task prioritized immediately based on urgent deadline and duration fit.`;
    }
  }

  // Status-driven explanations
  if (scored.status === 'interrupted' && scored.fitsTimeBudget) {
    return `Resuming interrupted task with ${scored.effectiveRemainingMinutes}m remaining in your ${availableMinutes}m window.`;
  }

  if (scored.isOverdue) {
    return scored.fitsTimeBudget
      ? `Overdue deadline requires immediate action and fits within your available ${availableMinutes} minutes.`
      : `Overdue deadline requires immediate intervention (~${scored.effectiveRemainingMinutes}m needed).`;
  }

  if (task.priority === 'urgent' && scored.fitsTimeBudget) {
    return `Urgent priority task that fits directly into your available ${availableMinutes} minutes.`;
  }

  if (scored.isApproaching && scored.fitsTimeBudget) {
    return `Deadline approaching (${task.deadline}) and estimated ~${scored.effectiveRemainingMinutes}m fits your available ${availableMinutes} minutes.`;
  }

  if (availableMinutes <= 20 && scored.effectiveRemainingMinutes <= availableMinutes) {
    return `Short task (~${scored.effectiveRemainingMinutes}m) ideal for a quick win in your limited ${availableMinutes}m window.`;
  }

  if (scored.fitsTimeBudget) {
    return `Achievable high-value quest that fits comfortably inside your available ${availableMinutes}m window.`;
  }

  if (task.priority === 'urgent' || task.priority === 'high') {
    return `High priority focus goal — recommend starting a sprint or breaking into smaller subtasks.`;
  }

  return `Scheduled based on current priority (${task.priority}) and remaining duration (~${scored.effectiveRemainingMinutes}m).`;
}

/**
 * Main Adaptive Scheduling Engine
 * Evaluates all pending tasks deterministically and returns ranked recommendations.
 */
export function calculateAdaptiveSchedule(
  tasks: TaskItem[],
  options: SchedulerOptions
): ScheduleCalculationResult {
  const {
    availableMinutes,
    energyLevel = 'med',
    lastEvent = null,
    previousTopTaskId = null,
  } = options;

  // 1. Exclude completed tasks
  const pendingTasks = tasks.filter((t) => !t.completed && t.status !== 'completed');

  if (pendingTasks.length === 0) {
    return {
      recommendedTask: null,
      rankedTasks: [],
      allPendingCount: 0,
      availableMinutes,
      recalculationReason: 'All tasks completed or task list is empty.',
      eventDescription: lastEvent ? lastEvent.description : 'Initial state',
      timestamp: Date.now(),
    };
  }

  // 2. Score each pending task
  const scoredList: ScoredTask[] = pendingTasks.map((task) => {
    // Determine effective remaining duration
    // Clamped to at least 1 minute to handle negative or invalid inputs safely
    const effectiveRemainingMinutes = Math.max(
      1,
      typeof task.remainingMinutes === 'number' && !isNaN(task.remainingMinutes)
        ? task.remainingMinutes
        : typeof task.estimatedMinutes === 'number' && !isNaN(task.estimatedMinutes)
        ? task.estimatedMinutes
        : 15
    );

    const deadlineInfo = parseDeadlineToUrgency(task.deadline);
    const priorityInfo = calculatePriorityScore(task.priority);
    const isUrgentOrOverdue = deadlineInfo.isOverdue || task.priority === 'urgent';

    const fitInfo = calculateTimeFitScore(
      effectiveRemainingMinutes,
      availableMinutes,
      isUrgentOrOverdue
    );

    const postponeInfo = calculatePostponeImpact(task.postponeCount, task.lastPostponedAt);
    const interruptionInfo = calculateInterruptionImpact(
      task.status,
      effectiveRemainingMinutes,
      availableMinutes
    );
    const energyInfo = calculateEnergyScore(task.staminaPoints, energyLevel);

    // Total aggregate score
    let totalScore =
      priorityInfo.score +
      deadlineInfo.score +
      fitInfo.score +
      interruptionInfo.score +
      energyInfo.score -
      postponeInfo.penalty;

    // Collect modular reasons for transparency
    const reasons: string[] = [];

    // Priority reason
    reasons.push(priorityInfo.explanation);

    // Deadline reason
    if (deadlineInfo.score > 0) {
      reasons.push(deadlineInfo.explanation);
    }

    // Time fit reason
    reasons.push(fitInfo.explanation);

    // Interruption reason
    if (interruptionInfo.explanation) {
      reasons.push(interruptionInfo.explanation);
    }

    // Postpone reason
    if (postponeInfo.explanation) {
      reasons.push(postponeInfo.explanation);
    }

    // Energy match reason
    if (energyInfo.explanation) {
      reasons.push(energyInfo.explanation);
    }

    return {
      task,
      score: totalScore,
      effectiveRemainingMinutes,
      isOverdue: deadlineInfo.isOverdue,
      isApproaching: deadlineInfo.isApproaching,
      isUrgentOrOverdue,
      fitsTimeBudget: fitInfo.fitsTimeBudget,
      fitRatio: fitInfo.fitRatio,
      reasons,
      primaryExplanation: '', // Generated after ranking
    };
  });

  // 3. Multi-tier deterministic sorting:
  // - Score descending
  // - Tie-breaker 1: Overdue / Urgent first
  // - Tie-breaker 2: Fits time budget first
  // - Tie-breaker 3: Shorter remaining duration first (lower friction)
  // - Tie-breaker 4: Earlier createdAt timestamp (stable order)
  scoredList.sort((a, b) => {
    if (Math.abs(b.score - a.score) >= 0.01) {
      return b.score - a.score;
    }
    if (a.isUrgentOrOverdue !== b.isUrgentOrOverdue) {
      return a.isUrgentOrOverdue ? -1 : 1;
    }
    if (a.fitsTimeBudget !== b.fitsTimeBudget) {
      return a.fitsTimeBudget ? -1 : 1;
    }
    if (a.effectiveRemainingMinutes !== b.effectiveRemainingMinutes) {
      return a.effectiveRemainingMinutes - b.effectiveRemainingMinutes;
    }
    return a.task.createdAt - b.task.createdAt;
  });

  // 4. Generate human explanations and rank change notes
  const topTask = scoredList[0] || null;

  scoredList.forEach((scored, index) => {
    const isTop = index === 0;
    scored.primaryExplanation = generatePrimaryExplanation(
      scored.task,
      {
        isOverdue: scored.isOverdue,
        isApproaching: scored.isApproaching,
        fitsTimeBudget: scored.fitsTimeBudget,
        effectiveRemainingMinutes: scored.effectiveRemainingMinutes,
        score: scored.score,
        priority: scored.task.priority,
        status: scored.task.status,
        postponeCount: scored.task.postponeCount,
      },
      availableMinutes,
      lastEvent,
      isTop
    );

    // Annotate rank changes compared to previous top task
    if (isTop && previousTopTaskId && previousTopTaskId !== scored.task.id) {
      if (lastEvent?.type === 'task_postponed') {
        scored.rankChangeNote = `Moved to #1 after previous task was postponed`;
      } else if (lastEvent?.type === 'time_changed') {
        scored.rankChangeNote = `Promoted to #1 because it fits your updated ${availableMinutes}m window`;
      } else if (lastEvent?.type === 'task_completed') {
        scored.rankChangeNote = `Promoted to #1 following task completion`;
      } else if (lastEvent?.type === 'task_interrupted') {
        scored.rankChangeNote = `Resumed at #1 with preserved remaining progress`;
      }
    }
  });

  // Reason for recalculation summary
  let recalculationReason = 'Schedule calculated based on current priority and time window.';
  if (lastEvent) {
    switch (lastEvent.type) {
      case 'task_postponed':
        recalculationReason = `Plan updated: "${lastEvent.taskTitle || 'Task'}" was postponed; recommendations adjusted.`;
        break;
      case 'task_interrupted':
        recalculationReason = `Plan updated: "${lastEvent.taskTitle || 'Task'}" was interrupted; remaining work preserved.`;
        break;
      case 'time_changed':
        recalculationReason = `Plan updated: Available window changed to ${availableMinutes}m; rankings recalculated.`;
        break;
      case 'task_completed':
        recalculationReason = `Plan updated: "${lastEvent.taskTitle || 'Task'}" completed; next goal recommended.`;
        break;
      case 'task_added':
        recalculationReason = `Plan updated: New task "${lastEvent.taskTitle || 'Task'}" evaluated in schedule.`;
        break;
      case 'task_overrun':
        recalculationReason = `Plan updated: Duration adjustment for "${lastEvent.taskTitle || 'Task'}".`;
        break;
      default:
        recalculationReason = lastEvent.description;
    }
  }

  return {
    recommendedTask: topTask,
    rankedTasks: scoredList,
    allPendingCount: pendingTasks.length,
    availableMinutes,
    recalculationReason,
    eventDescription: lastEvent ? lastEvent.description : 'Initial calculation',
    timestamp: Date.now(),
  };
}

/**
 * Event creation helpers
 */
export function createScheduleEvent(
  type: ScheduleChangeEvent['type'],
  description: string,
  extra: Partial<ScheduleChangeEvent> = {}
): ScheduleChangeEvent {
  return {
    type,
    description,
    timestamp: Date.now(),
    ...extra,
  };
}
