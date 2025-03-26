├── app/
│ ├── (dashboard)/  
│ │ ├── layout.jsx # Dashboard layout (sidebar + header)
│ │ ├── page.jsx # Dashboard home (stats/overview)
│ │ ├── create-post/
│ │ │ ├── page.jsx # Create/schedule post UI
│ │ │ └── components/
│ │ │ ├── PlatformSelector.jsx # Platform checkboxes
│ │ │ ├── MediaUploader.jsx # Drag-and-drop for media
│ │ │ └── ScheduleToggle.jsx # "Post Now" vs "Schedule" toggle
│ │ ├── scheduled-posts/
│ │ │ ├── page.jsx # List of scheduled posts
│ │ │ └── components/
│ │ │ └── PostCard.jsx # Editable scheduled post
│ │ ├── all-posts/
│ │ │ ├── page.jsx # All posts (scheduled + published)
│ │ │ └── components/
│ │ │ └── PostStatus.jsx # Status per platform
│ │ └── account/
│ │ ├── page.jsx # User account settings
│ │ └── SocialConnections.jsx # Connect/disconnect social platforms
│ ├── auth/
│ │ ├── login/
│ │ │ └── page.jsx # Login page
│ │ └── register/
│ │ └── page.jsx # Registration page
│ └── api/  
│ ├── auth/
│ │ ├── [...nextauth]/route.js # NextAuth config
│ │ └── disconnect/route.js # Disconnect social account
│ ├── posts/
│ │ ├── route.js # CRUD for posts
│ │ └── schedule/route.js # Add post to BullMQ queue
│ ├── media/
│ │ └── route.js # Upload media to Firebase
│ └── webhooks/ # Platform webhooks
│ └── instagram/route.js
├── components/
│ ├── Shared/
│ │ ├── Sidebar.jsx # Navigation sidebar
│ │ └── AuthGuard.jsx # Protects dashboard routes
│ └── UI/
│ ├── Button.jsx
│ └── DatePicker.jsx # For scheduling
├── lib/
│ ├── db/
│ │ └── connect.js # MongoDB connection
│ ├── queues/
│ │ ├── postQueue.js # BullMQ queue setup
│ │ └── worker.js # Background job processor
│ ├── social/
│ │ ├── facebook.js # FB/Instagram API client
│ │ ├── youtube.js # YouTube Shorts upload
│ │ └── helpers/
│ │ └── mediaDownloader.js # Fetch media from Firebase
│ └── firebase.js # Firebase config
├── models/
│ ├── User.js # User schema
│ ├── Post.js # Post schema
│ └── SocialAccount.js # Linked social platforms
└── docs/ # Mechanism explanations
├── AUTHENTICATION.md
├── SCHEDULING.md
├── MEDIA_HANDLING.md
├── SOCIAL_API_INTEGRATION.md
└── ERROR_HANDLING.md
