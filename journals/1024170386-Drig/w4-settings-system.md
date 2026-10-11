# Week 4: Settings System and Configuration

## Problem: Updated Settings Not Reflected Across Screens

### Error

Changes made in the settings section were not consistently reflected in other parts of the application that depended on those preferences.

### Relevant Context

The settings system allows users to configure their preferred application behaviour. These preferences may affect audio controls, the focus environment, notifications, and other customization options.

### Key Observation

If different screens maintain independent copies of the same settings, updating one copy does not automatically update the others. This can result in inconsistent application behaviour.

### Solution

A centralized settings system should manage shared user preferences. When a setting is changed, the application should update the shared state, save the new value when required, and notify the relevant components so that the changes are applied consistently.

### Because

Centralized configuration reduces duplicated logic, improves maintainability, and provides a consistent user experience throughout the application.
