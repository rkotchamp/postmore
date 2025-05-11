---
description: 
globs: 
alwaysApply: false
---
# State Management Architecture

This project utilizes a combination of Zustand and TanStack Query for state management, having transitioned away from Jotai for UI-specific state.

## Core Libraries:

*   **Zustand:** Used for managing global client-side state. This includes:
    *   UI-specific state (e.g., current step in a wizard, selected post type, temporary text inputs) managed in [`app/lib/store/uiStateStore.js`](mdc:app/lib/store/uiStateStore.js).
    *   Client-side post configuration data (e.g., selected accounts, schedule details, caption modes, and captions themselves before submission) managed in [`app/lib/store/postStore.js`](mdc:app/lib/store/postStore.js).
*   **TanStack Query (React Query):** Used for all server state management. This includes fetching data from the server, caching it, and handling mutations (e.g., uploading media, persisting text content to the backend). Hook implementations related to this can often be found in the `app/hooks/` directory.

## Key Store Files:

*   **UI State (`uiStateStore.js`):** [`app/lib/store/uiStateStore.js`](mdc:app/lib/store/uiStateStore.js) - Contains state directly related to the user interface behavior and temporary states within the post creation flow.
*   **Post Configuration State (`postStore.js`):** [`app/lib/store/postStore.js`](mdc:app/lib/store/postStore.js) - Holds the data that defines a post being created, such as selected accounts, captions, and scheduling information, until it is ready for submission.

## Historical Context:

*   **Jotai:** Was previously used for managing fine-grained UI state (formerly in `app/lib/store/uiAtoms.js`), but has been **removed** and its responsibilities are now handled by the Zustand `uiStateStore.js` or local component state where appropriate.

This setup aims to separate server state concerns (handled by TanStack Query) from client-side global state (handled by Zustand), promoting a clear data flow and separation of concerns.

# Blob URL and React State Management

## Issue Background
The application experienced infinite loop issues primarily in the `Preview.jsx` component when handling video files and blob URLs. The problems stemmed from improper state management and dependencies in React's hooks.

## Root Causes

### 1. Setting State Inside useMemo
In `[app/dashboard/preview/Preview.jsx](mdc:app/dashboard/preview/Preview.jsx)`, state updates were being triggered inside a `useMemo` function:

```jsx
const previewUrls = useMemo(() => {
  setBlobUrlsCreated(false); // ❌ State update inside useMemo
  // ...
  setTimeout(() => {
    setBlobUrlsCreated(true); // ❌ Another state update inside useMemo
  }, 100);
  return urls;
}, [mediaItems]);
```

This pattern causes infinite loops because state updates trigger re-renders, which re-execute useMemo, creating a cycle.

### 2. Cleanup Effect Dependencies
The blob URLs cleanup effect was using an empty dependency array but referencing the latest `previewUrls` from render scope:

```jsx
useEffect(() => {
  return () => {
    Object.values(previewUrls).forEach((url) => { // ❌ Captures previewUrls from render
      URL.revokeObjectURL(url);
    });
  };
}, []); // Empty dependency array - only runs on unmount
```

This could revoke URLs too early or reference stale data.

## Solution

### 1. Separate State Updates from useMemo
The state updates should be moved to a separate useEffect:

```jsx
const previewUrls = useMemo(() => {
  const urls = {};
  // Create blob URLs...
  return urls;
}, [mediaItems]);

// Separate effect for state updates
useEffect(() => {
  setBlobUrlsCreated(false);
  const timer = setTimeout(() => {
    setBlobUrlsCreated(true);
  }, 100);
  return () => clearTimeout(timer); // Clean up timer
}, [mediaItems]);
```

### 2. Use Refs for Cleanup References
For cleanup effects with empty dependency arrays, use refs to track the latest values:

```jsx
const previewUrlsRef = useRef(previewUrls);

// Update ref when previewUrls changes
useEffect(() => {
  previewUrlsRef.current = previewUrls;
}, [previewUrls]);

useEffect(() => {
  return () => {
    Object.values(previewUrlsRef.current).forEach((url) => {
      URL.revokeObjectURL(url);
    });
  };
}, []);
```

### 3. Memoize Components and Calculations
Memoize expensive calculations and child components to prevent unnecessary re-renders:

```jsx
const MemoizedComponent = memo(() => <Component />);
const calculatedValue = useMemo(() => expensiveCalculation(), [dependencies]);
```

## Additional Performance Improvements
- Use `memo()` for component functions that don't need to re-render with every parent render
- Calculate derived state with `useMemo()` instead of recalculating on every render
- Ensure proper dependency arrays in all hooks
- Use `useCallback()` for functions passed as props
