import assert from 'node:assert';
import { TaskItem, ScheduleChangeEvent } from '../src/types';
import {
  calculateAdaptiveSchedule,
  createScheduleEvent,
  parseDeadlineToUrgency,
  calculateTimeFitScore,
} from '../src/utils/adaptiveScheduler';

console.log('🧪 Starting FOCUS.OS Adaptive Rescheduling Engine Test Suite...\n');

let testsPassed = 0;
let testsTotal = 0;

function runTest(name: string, fn: () => void) {
  testsTotal++;
  try {
    fn();
    testsPassed++;
    console.log(`  ✅ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message || err}`);
    if (err.stack) {
      console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
}

// Mock Tasks Helper
function createMockTask(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: `task-${Math.random().toString(36).substring(7)}`,
    title: 'Sample Task',
    priority: 'normal',
    deadline: 'Tomorrow',
    estimatedMinutes: 30,
    remainingMinutes: undefined,
    staminaPoints: 2,
    completed: false,
    category: 'academic',
    subtasks: [],
    createdAt: Date.now(),
    status: 'pending',
    postponeCount: 0,
    ...overrides,
  };
}

// ==========================================
// SCENARIO 1: High-priority task with approaching deadline ranks appropriately
// ==========================================
runTest('Scenario 1: High-priority task with approaching deadline ranks top', () => {
  const taskA = createMockTask({
    id: 'task-a',
    title: 'Urgent DBMS submission',
    priority: 'urgent',
    deadline: 'Today 5 PM',
    estimatedMinutes: 25,
  });

  const taskB = createMockTask({
    id: 'task-b',
    title: 'Casual room cleanup',
    priority: 'low',
    deadline: 'Next month',
    estimatedMinutes: 20,
  });

  const result = calculateAdaptiveSchedule([taskA, taskB], {
    availableMinutes: 30,
  });

  assert.strictEqual(result.recommendedTask?.task.id, 'task-a', 'Task A should be recommended');
  assert.ok(result.recommendedTask.score > result.rankedTasks[1].score, 'Task A score should be higher');
  assert.ok(result.recommendedTask.primaryExplanation.length > 0, 'Explanation must exist');
});

// ==========================================
// SCENARIO 2: Short task considered when available time is limited
// ==========================================
runTest('Scenario 2: Short task prioritized when available time is limited', () => {
  const longImportantTask = createMockTask({
    id: 'long-task',
    title: 'Full Software Architecture Spec',
    priority: 'high',
    deadline: 'In 3 days',
    estimatedMinutes: 90, // Exceeds short 15m window
  });

  const quickWinTask = createMockTask({
    id: 'quick-task',
    title: 'Reply to project partner email',
    priority: 'normal',
    deadline: 'Today',
    estimatedMinutes: 10, // Comfortably fits 15m window
  });

  const result = calculateAdaptiveSchedule([longImportantTask, quickWinTask], {
    availableMinutes: 15,
  });

  assert.strictEqual(
    result.recommendedTask?.task.id,
    'quick-task',
    'Quick task should rank top for 15m window'
  );
  assert.ok(result.recommendedTask.fitsTimeBudget, 'Quick task must fit time budget');
  assert.strictEqual(result.rankedTasks[1].fitsTimeBudget, false, 'Long task does not fit');
  assert.ok(
    result.recommendedTask.primaryExplanation.includes('15') ||
      result.recommendedTask.primaryExplanation.includes('window') ||
      result.recommendedTask.primaryExplanation.includes('fits'),
    'Explanation highlights time fit'
  );
});

// ==========================================
// SCENARIO 3: Completed tasks must NEVER appear in recommendations
// ==========================================
runTest('Scenario 3: Completed tasks are strictly excluded from recommendations', () => {
  const doneTask = createMockTask({
    id: 'done-1',
    title: 'Completed math homework',
    priority: 'urgent',
    completed: true,
  });

  const doneTaskStatus = createMockTask({
    id: 'done-2',
    title: 'Completed design brief',
    status: 'completed',
    completed: false,
  });

  const activeTask = createMockTask({
    id: 'active-1',
    title: 'Active assignment',
    completed: false,
    status: 'pending',
  });

  const result = calculateAdaptiveSchedule([doneTask, doneTaskStatus, activeTask], {
    availableMinutes: 30,
  });

  assert.strictEqual(result.allPendingCount, 1, 'Only 1 pending task should remain');
  assert.strictEqual(result.rankedTasks.length, 1, 'Ranked list should only contain active task');
  assert.strictEqual(result.recommendedTask?.task.id, 'active-1', 'Active task is recommended');
});

// ==========================================
// SCENARIO 4: Postponing a task triggers recalculation and demotion
// ==========================================
runTest('Scenario 4: Postponing a task demotes it and recalculates next best task', () => {
  const task1 = createMockTask({
    id: 'task-1',
    title: 'Hard Physics problem set',
    priority: 'high',
    deadline: 'Tomorrow',
    estimatedMinutes: 25,
    postponeCount: 0,
  });

  const task2 = createMockTask({
    id: 'task-2',
    title: 'History essay draft outline',
    priority: 'high',
    deadline: 'Tomorrow',
    estimatedMinutes: 25,
    postponeCount: 0,
    createdAt: task1.createdAt + 10,
  });

  // Initial: task1 is top
  const initial = calculateAdaptiveSchedule([task1, task2], { availableMinutes: 30 });
  assert.strictEqual(initial.recommendedTask?.task.id, 'task-1');

  // User postpones task1
  const postponedTask1: TaskItem = {
    ...task1,
    status: 'postponed',
    postponeCount: 1,
    lastPostponedAt: Date.now(),
  };

  const postponeEvent = createScheduleEvent(
    'task_postponed',
    'Task "Hard Physics problem set" was postponed',
    { taskId: task1.id, taskTitle: task1.title }
  );

  const afterPostpone = calculateAdaptiveSchedule([postponedTask1, task2], {
    availableMinutes: 30,
    lastEvent: postponeEvent,
    previousTopTaskId: 'task-1',
  });

  assert.strictEqual(
    afterPostpone.recommendedTask?.task.id,
    'task-2',
    'Task 2 should now take the #1 recommendation spot'
  );
  assert.ok(
    afterPostpone.recommendedTask.primaryExplanation.includes('postponed') ||
      afterPostpone.recommendedTask.rankChangeNote?.includes('postponed'),
    'Explanation mentions postponement of previous task'
  );
});

// ==========================================
// SCENARIO 5: Interrupting a task preserves remaining work & recalculates
// ==========================================
runTest('Scenario 5: Interrupted task preserves remaining duration and is eligible for resumption', () => {
  // A 45-minute task was interrupted after 20 minutes (25m remaining)
  const interruptedTask = createMockTask({
    id: 'int-1',
    title: 'Research Database Indexing',
    estimatedMinutes: 45,
    remainingMinutes: 25, // Preserved remaining work
    status: 'interrupted',
    interruptedAt: Date.now(),
    actualMinutesSpent: 20,
  });

  const otherTask = createMockTask({
    id: 'other-1',
    title: 'Organize files',
    estimatedMinutes: 30,
    priority: 'low',
  });

  const interruptEvent = createScheduleEvent(
    'task_interrupted',
    'Task was interrupted with 25m remaining work',
    { taskId: interruptedTask.id, taskTitle: interruptedTask.title }
  );

  const result = calculateAdaptiveSchedule([interruptedTask, otherTask], {
    availableMinutes: 30, // Fits the 25m remaining work!
    lastEvent: interruptEvent,
  });

  assert.strictEqual(
    result.recommendedTask?.task.id,
    'int-1',
    'Interrupted task should be recommended'
  );
  assert.strictEqual(
    result.recommendedTask.effectiveRemainingMinutes,
    25,
    'Remaining duration should be 25m, not initial 45m'
  );
  assert.ok(result.recommendedTask.fitsTimeBudget, '25m fits into 30m window');
  assert.ok(
    result.recommendedTask.primaryExplanation.includes('25') ||
      result.recommendedTask.primaryExplanation.includes('resume') ||
      result.recommendedTask.primaryExplanation.includes('interrupted'),
    'Explanation highlights resumption of remaining work'
  );
});

// ==========================================
// SCENARIO 6: Changing available time affects the ranking
// ==========================================
runTest('Scenario 6: Increasing or decreasing available time updates ranking dynamically', () => {
  const task60m = createMockTask({
    id: 'deep-60',
    title: 'Deep Research Lab Report',
    priority: 'high',
    deadline: 'Tomorrow',
    estimatedMinutes: 60,
  });

  const task20m = createMockTask({
    id: 'sprint-20',
    title: 'Review quiz flashcards',
    priority: 'high',
    deadline: 'Tomorrow',
    estimatedMinutes: 20,
  });

  // When time is only 25 minutes: 20m task should win
  const shortWindow = calculateAdaptiveSchedule([task60m, task20m], {
    availableMinutes: 25,
    lastEvent: createScheduleEvent('time_changed', 'Time changed to 25m', {
      previousMinutes: 60,
      newMinutes: 25,
    }),
  });
  assert.strictEqual(shortWindow.recommendedTask?.task.id, 'sprint-20');

  // When time expands to 65 minutes: 60m deep research task fits and can rank higher
  const longWindow = calculateAdaptiveSchedule([task60m, task20m], {
    availableMinutes: 65,
    lastEvent: createScheduleEvent('time_changed', 'Time changed to 65m', {
      previousMinutes: 25,
      newMinutes: 65,
    }),
  });
  assert.strictEqual(longWindow.recommendedTask?.task.id, 'deep-60');
  assert.ok(longWindow.recommendedTask.fitsTimeBudget);
});

// ==========================================
// SCENARIO 7: Adding a new urgent task updates the ranking immediately
// ==========================================
runTest('Scenario 7: Adding an urgent approaching task recalculates and surfaces it immediately', () => {
  const existingTask = createMockTask({
    id: 'exist-1',
    title: 'Routine reading',
    priority: 'normal',
    deadline: 'In 3 days',
    estimatedMinutes: 30,
  });

  const initial = calculateAdaptiveSchedule([existingTask], { availableMinutes: 30 });
  assert.strictEqual(initial.recommendedTask?.task.id, 'exist-1');

  // User adds new urgent task
  const newUrgentTask = createMockTask({
    id: 'urgent-new',
    title: 'Submit Emergency Lab Attendance Form',
    priority: 'urgent',
    deadline: 'Today',
    estimatedMinutes: 15,
  });

  const addEvent = createScheduleEvent('task_added', 'Added urgent task', {
    taskId: newUrgentTask.id,
    taskTitle: newUrgentTask.title,
  });

  const updated = calculateAdaptiveSchedule([newUrgentTask, existingTask], {
    availableMinutes: 30,
    lastEvent: addEvent,
  });

  assert.strictEqual(
    updated.recommendedTask?.task.id,
    'urgent-new',
    'Newly added urgent task should take the #1 recommendation'
  );
});

// ==========================================
// SCENARIO 8: Empty state handling
// ==========================================
runTest('Scenario 8: No pending tasks produces sensible empty state', () => {
  const result = calculateAdaptiveSchedule([], { availableMinutes: 30 });

  assert.strictEqual(result.recommendedTask, null);
  assert.strictEqual(result.rankedTasks.length, 0);
  assert.strictEqual(result.allPendingCount, 0);
  assert.ok(result.recalculationReason.length > 0);
});

// ==========================================
// SCENARIO 9: Edge cases (0 time, negative duration, overdue tasks, identical scores)
// ==========================================
runTest('Scenario 9: Edge cases handled safely (0 available time, negative duration, overdue)', () => {
  // Edge Case A: Available time is 0 or negative
  const task = createMockTask({
    id: 'edge-1',
    title: 'Valid task with negative time window',
    estimatedMinutes: -10, // Negative duration
  });

  const zeroTimeResult = calculateAdaptiveSchedule([task], { availableMinutes: 0 });
  assert.ok(zeroTimeResult.recommendedTask !== null);
  assert.strictEqual(
    zeroTimeResult.recommendedTask.effectiveRemainingMinutes,
    1,
    'Negative duration should be clamped to at least 1 min'
  );
  assert.strictEqual(zeroTimeResult.recommendedTask.fitsTimeBudget, false);

  // Edge Case B: Overdue task receives critical priority
  const overdueTask = createMockTask({
    id: 'overdue-1',
    title: 'Past due report',
    deadline: 'Overdue by 1 day',
    priority: 'normal',
    estimatedMinutes: 20,
  });

  const standardTask = createMockTask({
    id: 'normal-1',
    title: 'Standard task due next week',
    deadline: 'Next week',
    priority: 'high',
    estimatedMinutes: 20,
  });

  const overdueResult = calculateAdaptiveSchedule([overdueTask, standardTask], {
    availableMinutes: 25,
  });
  assert.strictEqual(
    overdueResult.recommendedTask?.task.id,
    'overdue-1',
    'Overdue task should override standard upcoming task'
  );
  assert.strictEqual(overdueResult.recommendedTask.isOverdue, true);

  // Edge Case C: Identical priorities and deadlines tie-breaker is deterministic
  const tieTaskA = createMockTask({
    id: 'tie-a',
    title: 'Task A',
    priority: 'normal',
    deadline: 'Tomorrow',
    estimatedMinutes: 20,
    createdAt: 1000,
  });

  const tieTaskB = createMockTask({
    id: 'tie-b',
    title: 'Task B',
    priority: 'normal',
    deadline: 'Tomorrow',
    estimatedMinutes: 20,
    createdAt: 2000,
  });

  const tieResult1 = calculateAdaptiveSchedule([tieTaskA, tieTaskB], { availableMinutes: 30 });
  const tieResult2 = calculateAdaptiveSchedule([tieTaskB, tieTaskA], { availableMinutes: 30 });

  assert.strictEqual(tieResult1.recommendedTask?.task.id, tieResult2.recommendedTask?.task.id);
  assert.strictEqual(tieResult1.recommendedTask?.task.id, 'tie-a', 'Stable tie break by createdAt');
});

console.log(`\n========================================`);
console.log(`Test Execution Summary: ${testsPassed} / ${testsTotal} PASSED`);
console.log(`========================================\n`);

if (testsPassed !== testsTotal) {
  process.exit(1);
}
