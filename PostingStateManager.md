# Posting State Management Implementation

## Status Update (as of last interaction)

### Completed / Partially Completed Steps

1.  **Initial Setup:** **DONE**

    - Installed TanStack Query packages (`@tanstack/react-query`, `@tanstack/query-sync-storage-persister`, `@tanstack/react-query-persist-client`, `@tanstack/react-query-devtools`) using `--legacy-peer-deps` due to dependency conflicts.

2.  **Provider Setup:** **DONE**

    - Created `app/providers/QueryProvider.jsx` wrapping the application with `PersistQueryClientProvider` and `ReactQueryDevtools`.
    - Integrated `QueryProvider` into `app/layout.jsx`.

3.  **Query/Mutation Hooks:** **DONE (with caveats)**

    - Created `app/hooks/useMediaQueries.js` (`useMediaItems`, `useCarouselState`, `useTextContent`).
    - Created `app/hooks/useMediaMutations.js` (`updateMedia`, `updateCarouselState`, `updateTextContent`, `clearMedia`).
    - **Caveat:** The primary persistence strategy shifted. Media/Carousel state is now session-based. Text state uses these hooks for `localStorage` persistence. Media hooks might still be used for final save, but not session display. Blob URL cleanup logic was added to mutations.

4.  **Component Integration:** **PARTIALLY DONE / IN PROGRESS**

    - `MediaPosts.jsx`: Uses session logic (`useState`, callbacks) for UI, TanStack mutations potentially for saving. `isMounted` fix applied.
    - `TextPost.jsx`: Uses `useTextContent` for initial load, `onTemporaryTextChange` prop for updates. Persistence triggered by `DashboardContent`.
    - `Content.jsx`: Manages active tab (persisted via `localStorage`), session media presence, and temporary text. Uses callbacks to communicate with `DashboardContent`. `isMounted` fix applied.
    - `SelectAccount.jsx`: Updated to use `useEffect` for `onSelectionChange` to prevent render conflicts.
    - `Caption.jsx`: Refactored to use Accordion layout. Addressed character count error and infinite loop issues related to state updates/`useEffect`.
    - `Preview.jsx` & `TextPreview.jsx`: Updated/created to accept props (`sessionMediaItems`, `temporaryText`, `accounts`, `captions`) and display preview based on current data.
    - `DashboardContent.jsx`: Acts as the central orchestrator, managing steps, collecting data via memoized callbacks (`useCallback`), handling validation logic, and triggering text persistence/final submission.

5.  **Testing and Validation:** **IN PROGRESS**

    - Actively testing the implementation and encountering runtime errors (see Challenges).

6.  **Performance Optimization:** **NOT STARTED**

### Current State Summary

- **Media Management:** Media files (images/video) are handled transiently within the user session. `MediaPosts.jsx` manages local previews using `URL.createObjectURL` and state. It informs `DashboardContent` about media presence (`sessionHasMedia`). Blob URLs are cleaned up. The TanStack Query state for media exists but isn't the primary driver for the _current_ editing UI state.
- **Text Management:** Text entered in the 'Text' tab is held in `temporaryText` state within `Content.jsx` / `DashboardContent.jsx`. It's persisted to `localStorage` via the `updateTextContent` TanStack Query mutation only when the user proceeds ("Next") or submits from the 'Text' tab context. `useTextContent` reads the persisted value on load.
- **Tab State:** The active tab ('Media' vs 'Text') in `Content.jsx` is persisted directly using `localStorage` and `useEffect`.
- **Account Selection:** Selected accounts are stored in the `postData` state within `DashboardContent.jsx`, updated via a memoized callback passed to `SelectAccount.jsx`.
- **Captions & Scheduling:** Captions (single or per-platform) and scheduling details (`scheduled`, `scheduledDate`, `scheduledTime`) are managed within `Caption.jsx` state and passed up to `DashboardContent.jsx` via a memoized callback.
- **Overall Flow:** `DashboardContent.jsx` manages the multi-step process, conditionally rendering components (`Content`, `SelectAccount`, `Caption`) and the correct preview (`Preview` or `TextPreview`). It enables/disables the "Next" button based on step validity and handles the final data aggregation for submission.

### Recent Challenges & Fixes

1.  **Hydration / Render Timing Errors:**
    - **Issue:** Errors occurred when child components (`MediaPosts`, `Content`) called parent callbacks (`onContentChange`) within `useEffect` hooks immediately upon mounting or state change, leading to attempts to update `DashboardContent` state during hydration or rendering.
    - **Fix:** Introduced an `isMounted` state check within the relevant `useEffect` hooks in `MediaPosts` and `Content` to ensure callbacks are only invoked after the component has successfully mounted on the client.
2.  **State Update Conflicts (`SelectAccount`):**
    - **Issue:** "Cannot update a component (`DashboardContent`) while rendering a different component (`SelectAccount`)" error occurred because `SelectAccount` called `onSelectionChange` immediately after its internal `setSelectedAccounts`.
    - **Fix:** Moved the `onSelectionChange` call into a `useEffect` hook within `SelectAccount` that depends on the `selectedAccounts` state, ensuring the parent update happens _after_ the child finishes rendering.
3.  **Infinite Render Loop (`Switch` / `Caption`):**
    - **Issue:** "Maximum update depth exceeded" error originating from the `Switch` component used in `ScheduleToggle` within `Caption.jsx`. Likely caused by a loop involving state updates (`setScheduled`), `useEffect` dependencies (`scheduled`, etc.), the `onCaptionChange` callback, and potential unstable props from `DashboardContent`.
    - **Fix Attempt 1:** Separated schedule updates from caption text updates in `Caption.jsx`, having `handleScheduleToggle` call `onCaptionChange` directly. (Did not fully resolve).
    - **Fix Attempt 2 (Current):** Reverted Attempt 1. `handleScheduleToggle` _only_ updates local state. The main `useEffect` in `Caption.jsx` now depends on caption state _and_ schedule state again, calling `onCaptionChange` whenever any of these change post-render. This keeps all parent updates within the effect.

## Next Steps (Immediate Focus)

1.  **Test Caption/Schedule Flow:** Thoroughly test the interaction with the `ScheduleToggle` in `Caption.jsx` after the latest fix (Fix Attempt 2 for infinite loop) to confirm the "Maximum update depth exceeded" error is resolved.
2.  **Verify Final Submission:** Test the `handleSubmit` function in `DashboardContent.jsx`. Ensure it correctly gathers all necessary data pieces:
    - `contentType` (`'media'` or `'text'`)
    - `text` (persisted `temporaryText` if contentType is text)
    - `media` (`sessionMediaItems` if contentType is media)
    - `accounts` (selected accounts list)
    - `captions` (final caption object, including schedule details if applicable)
    - Confirm `updateTextContent` mutation is correctly called for text posts before submission proceeds.
3.  **Bug Fixing:** Address any remaining functional bugs identified during testing.

## Future Steps (Post-Core Functionality)

- **Refinement & Edge Cases:** Handle edge cases in the UI flow.
- **API Integration:** Replace `alert()` in `handleSubmit` with actual API call logic to schedule/post content.
- **Performance Optimization:** Implement query invalidation, loading states, error boundaries, and optimize re-renders as needed.
- **UI Polish:** Refine UI elements and interactions based on testing.

## File Structure (Unchanged)

```
app/
├── lib/
│   └── queryClient.js       # Query client configuration
├── hooks/
│   ├── useMediaQueries.js   # Read operations (Text focus now)
│   └── useMediaMutations.js # Write operations (Text focus now)
└── providers/
    └── QueryProvider.jsx    # Global provider setup
```

## Notes (Updated)

- Using localStorage via TanStack Query for **text content** persistence.
- Session state (`useState`) used for transient **media items** during post creation.
- `localStorage` used directly for **active tab** persistence in `Content.jsx`.
- DevTools only enabled in development.
- Blob URL cleanup implemented in `MediaPosts.jsx` and mutations.
- Following mobile-first responsive design.
- Maintaining consistent styling across components.
