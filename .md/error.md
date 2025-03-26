## Error Management

- **Failed Posts**: Platform-specific errors stored in `Post.platforms.error`.
- **Notifications**: Users see in-app alerts or emails via `react-toastify`.
- **Retries**: Manual retry option for failed posts.

Key Files:

- `app/(dashboard)/all-posts/components/PostStatus.jsx`
- `lib/queues/worker.js` (Error logging)
