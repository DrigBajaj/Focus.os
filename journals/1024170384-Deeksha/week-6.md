# Week 6 : Testing and Improving the Task Planning Experience

**Journal date:** 9 October 2026

# Evaluation of Core Functionality

## Error:

As the task-management and recommendation features became connected, it was important to check that they behaved consistently in different situations. Incorrect recommendations, completed tasks appearing again or interrupted tasks being excluded could reduce the usefulness of the application.

## Relevant Context

The core task-planning experience includes task creation, task prioritisation, available-time input, recommendations, task breakdown and handling of postponed or interrupted tasks.

The adaptive scheduling logic was tested against different combinations of task status, urgency and available time.

## Key Observation

Testing only a typical task scenario would not be sufficient. The recommendation system also needed to be checked when tasks were completed, postponed or interrupted, when available time was limited, and when there were no pending tasks.

## Solution

A set of nine scheduler test scenarios was used during development. These covered deadline urgency, limited available time, completed tasks, postponement, interruption recovery, changes in available time, newly added urgent tasks, an empty task list and edge cases.

Nine out of nine scenarios were reported as passing during development. Further evaluation with users and measurement of recommendation usefulness remain areas for future work.
