## Authentication Flow

- **Sign Up/Login**: Users sign up with email/password, Google, or GitHub.
- **Social Account Linking**: After logging in, users connect social platforms (FB, Instagram, etc.) via OAuth.
- **Token Storage**: Access/refresh tokens are encrypted and stored in `SocialAccount` collection.

Key Files:

- `app/api/auth/[...nextauth]/route.js` (NextAuth config)
- `app/(dashboard)/account/SocialConnections.jsx`
