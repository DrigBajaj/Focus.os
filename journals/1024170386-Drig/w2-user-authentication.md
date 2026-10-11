# Week 2: User Authentication and Login

## Problem
The login system did not consistently handle incorrect credentials or incomplete user input.

## Relevant Context
The authentication system manages user registration, login, and access to personalized FOCUS.OS features.

## Key Observation
Checking whether input fields are empty is different from verifying whether the supplied credentials are valid.

## Solution
Validate required fields before submitting login requests. Handle authentication failures with appropriate error messages and establish the authenticated state after successful login.

## Because
Proper validation improves login reliability and helps users understand errors without exposing sensitive authentication information.
