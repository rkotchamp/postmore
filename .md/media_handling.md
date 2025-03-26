## Media Upload & Storage

1. **Upload**: Users drag-and-drop media in `MediaUploader.jsx`.
2. **Firebase Storage**: Media is uploaded to Firebase via `app/api/media/route.js`.
3. **Database Reference**: Firebase URLs are stored in `Post.content.media`.

Key Files:

- `app/(dashboard)/create-post/components/MediaUploader.jsx`
- `lib/firebase.js`
