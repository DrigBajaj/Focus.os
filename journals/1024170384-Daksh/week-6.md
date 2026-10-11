# Week 6 : Reviewing Progress Tracking and Account-Specific Streaks

**Journal date:** 9 October 2026

# Progress Tracking Review

## Error:

During account testing, a newly registered user was displaying a five-day streak despite having no previous activity. This indicated that the progress display was not always reflecting the activity of the current account.

## Relevant Context

The streak calculation is handled by the progress utility, while activity information and companion data are associated with the user's application state. The initial review identified a fallback value in the streak calculation and browser storage keys that were shared between accounts.

## Key Observation

A progress indicator must be based on real activity and must not carry information from another account. A default streak value can make the interface appear populated, but it does not represent the user's actual progress.

## Solution

The streak calculation was reviewed to remove the artificial fallback and to make the stored streak information specific to each user. The updated behaviour needs to be verified by testing a fresh account and an existing account separately.

## Further Work

Additional review is required to confirm that streak history remains accurate across logins, account changes and application reloads. Progress feedback should remain encouraging without penalising users for missed days.
