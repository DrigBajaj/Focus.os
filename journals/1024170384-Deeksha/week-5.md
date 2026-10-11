# Week 5 : Handling Interruptions and Returning to Tasks

**Journal date:** 2 October 2026

# Interruption Recovery

## Error:

Users may not always complete a task in one sitting. They may be interrupted, pause their focus session or postpone the task. If the application treats an interruption as completion, or loses track of the unfinished work, users may have difficulty returning to it.

## Relevant Context

FOCUS.OS connects task planning with its focus-session experience. Task information can include the current status and the amount of work remaining. The adaptive scheduler is intended to reconsider unfinished tasks when generating later recommendations.

## Key Observation

An interrupted task is still pending work. It should remain part of the user's task list, and the application should retain enough information to help the user resume it.

## Solution

The task workflow was extended to account for interrupted and postponed tasks. The application records the task's updated status and remaining duration so that unfinished work can be considered again by the recommendation system. This supports schedule recovery instead of requiring users to recreate or manually reorganise the task.
