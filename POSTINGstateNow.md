# Posting Feature State Management Strategy

This document outlines the state management approach for the multi-step post creation feature. The state is categorized into three distinct areas to ensure clarity and maintainability.

## 1. Component Behaviour State (`MediaTextFlowContext.jsx`)

This category manages the dynamic behaviour and visual state of UI components based on user interactions and the type of content being created (Media vs. Text), primarily during the first step ("Content"). It dictates which UI elements are active, disabled, or visible.

**Managed By:** `app/context/MediaTextFlowContext.jsx` (Conceptual - specific implementation might vary)

**Responsibilities:**

- Tracks the primary content type flow (Media or Text) selected by the user in Step 0.
- Manages the enabled/disabled state of UI elements like tabs and the "Next" button based on the current flow and whether valid content (media added or text typed) exists _in the current session_.

**Specific Logic in `app/dashboard/content/Content.jsx` (Step 0):**

- **Media Flow:**
  - When a user uploads media (image or video) _in the current session_:
    - The component recognizes media is available.
    - The "Next" button becomes active.
    - The "Text" tab is disabled.
    - **Important:** The uploaded media state is **not** persisted if the user refreshes or leaves the page while still on Step 0.
- **Text Flow:**
  - When the "Text" tab is selected and the user begins typing _in the current session_:
    - The component recognizes text is present.
    - The "Next" button becomes active.
    - The "Media" tab is disabled.
    - **Important:** The typed text is **not** persisted if the user refreshes or leaves the page while still on Step 0. It only exists in the component's local state at this point.
- **Tab Switching:** Switching between "Media" and "Text" tabs within Step 0 will clear the transient state of the non-selected tab (e.g., switching to Text clears any session media, switching to Media clears any locally typed text).

**Caption Step Implication (After Step 0):**

- If proceeding with a Text post (meaning text _was_ persisted upon leaving Step 0):
  - Caption options will be disabled.

## 2. Post Data State (`PostDataContext.jsx`)

This category focuses on collecting and holding the actual data that constitutes the post _after_ the user has progressed past the initial content creation step (Step 0).

**Managed By:** `app/context/PostDataContext.jsx` (Conceptual - specific implementation might use TanStack Query or other state managers)

**Responsibilities:**

- Stores the core content: either the persisted text content _or_ references/data related to the media files intended for upload.
- Holds the list of selected social media accounts for posting.
- Aggregates caption data (if applicable, primarily for media posts).
- Stores scheduling details (e.g., `scheduleType`, `scheduledAt`).
- Provides functions to update these pieces of data and reset the state upon successful submission or cancellation.

## 3. Process Stage & Data Persistence (`localStorage` & Triggered Actions)

This category handles remembering the user's progress and persisting the relevant data _at specific transition points_.

**Managed By:** Primarily within the stepper component (e.g., `app/dashboard/components/dashboard-content.jsx`), utilizing `localStorage` and triggered actions (like TanStack mutations).

**Responsibilities:**

- **Step Persistence:**
  - Stores the index of the current active step (0, 1, or 2) in `localStorage`.
  - Reads this index on load to restore the user to the correct step.
  - Updates the index in `localStorage` on step transitions (Next/Previous).
- **Content Persistence (Triggered):**
  - **Media:** Media itself is _not_ persisted via `localStorage` due to size and complexity (blob URLs). Its state is session-based within Step 0. If the user proceeds from Step 0 with media, the _intent_ to use that media is carried forward (e.g., via `PostDataContext` or similar), but the actual files might need re-validation or handling during the final submission.
  - **Text:** Text content is **only persisted** (e.g., saved to `localStorage` via a mutation) when the user clicks "Next" to move from Step 0 to Step 1. It is _not_ saved while the user is still interacting within Step 0.
- **Active Tab (Optional Persistence):** The _choice_ of the active tab ("Media" or "Text") within Step 0 _can_ be persisted in `localStorage` to restore the UI state on refresh, even though the content itself is not saved at this stage.

This refined approach ensures transient content in Step 0 isn't prematurely saved, while still allowing progress and final data collection to be managed effectively.
