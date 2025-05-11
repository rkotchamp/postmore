# Media and Text Flow Documentation

This document outlines the flow and state management for handling media and text posts in the application. It describes the user journey through the Media and Text Vessels, detailing the relevant files and steps involved.

## Media Vessel

1. **Media Upload**

   - **File:** `MediaPosts.jsx`
   - **Action:** User drops or uploads an image or video.
   - **State Update:** Media items are updated and previewed in `Preview.jsx`.

2. **Account Selection**

   - **File:** `SelectAccount.jsx`
   - **Action:** User selects accounts to post to.
   - **State Update:** Selected accounts are previewed in `Preview.jsx`.

3. **Caption and Scheduling**
   - **File:** `Caption.jsx`
   - **Action:** User chooses captions and scheduling options.
   - **State Update:** Captions are set, and scheduling is configured.

## Text Vessel

1. **Text Input**

   - **File:** `Text.jsx`
   - **Action:** User starts typing.
   - **State Update:** Text is previewed in `TextPreview.jsx` immediately.

2. **Account Selection**

   - **File:** `SelectAccount.jsx`
   - **Action:** User selects accounts to post to.
   - **State Update:** Selected accounts are previewed in `TextPreview.jsx`.

3. **Scheduling**
   - **File:** `Caption.jsx`
   - **Action:** User sets scheduling options.
   - **State Update:** Scheduling is configured, captions are not shown or faded.

## State Management

- **Global State:** Consider using a state management library to handle global state across components.
- **Immediate Updates:** Ensure that state updates trigger immediate re-renders where necessary, especially for previews.
- **Component Communication:** Use props and callbacks to communicate between components, ensuring that changes in one component reflect in others.
