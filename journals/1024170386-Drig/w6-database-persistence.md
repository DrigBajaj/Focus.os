# Week 6: Database Persistence and User Data Isolation

## Error
Browser-side storage was insufficient for maintaining user data across sessions, and there was a risk of one account displaying another user's information.

## Relevant Context
FOCUS.OS uses a Node.js and Express backend with SQLite to store users, tasks, subtasks, routines, sessions, and companion data.

## Key Observation
Database operations must use the authenticated user's ID, and cached browser data must not overwrite or mix with another account's information.

## Solution
Integrated SQLite persistence to store and preserve users' tasks, routines, subtasks, and companion data. Reviewed account-specific data loading and synchronisation to ensure that existing tasks and routines remain preserved while preventing old account data from appearing in newly registered accounts.

## Further Work
Test data isolation across multiple accounts and verify that tasks and routines persist after application restarts and redeployment.
