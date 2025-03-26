## Post Scheduling

- **Immediate Posting**: Treated as a job with `scheduledAt = current time`.
- **Delayed Posting**: Jobs are queued with BullMQ and processed at `scheduledAt`.
- **Worker Process**: Background worker (`lib/queues/worker.js`) handles API calls to platforms.

Key Files:

- `lib/queues/postQueue.js` (BullMQ setup)
- `app/api/posts/schedule/route.js` (Add to queue)
