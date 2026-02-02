# 🚀 PostMoore - Social Media Scheduling Platform

A comprehensive social media management platform that allows users to schedule and publish content across multiple social media platforms from a single dashboard.

## 📋 Table of Contents

- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## 🎯 About

PostMoore is a modern social media scheduling platform built with Next.js 15 that enables content creators, businesses, and agencies to efficiently manage their social media presence across multiple platforms including:

- **YouTube Shorts**
- **TikTok**
- **Instagram**
- **Twitter/X**
- **Facebook**
- **LinkedIn**
- **Bluesky**
- **Threads**
- **Pinterest** -**Twitch may be**

## ✨ Features

### Core Features

- 📅 **Content Scheduling** - Schedule posts across multiple platforms
- 🎨 **Media Management** - Upload and manage images, videos, and carousels
- 📊 **Analytics Dashboard** - Track post performance and engagement
- 🔄 **Bulk Operations** - Schedule multiple posts simultaneously
- 📱 **Multi-Platform Support** - Post to 9+ social media platforms
- 🎯 **Content Customization** - Tailor content for each platform's requirements

### Advanced Features

- 🤖 **Queue Management** - Background job processing with BullMQ
- 🔐 **OAuth Integration** - Secure authentication with social platforms
- 💳 **Subscription Management** - Stripe-powered billing sydont burn stem
- 📧 **Email Notifications** - Automated alerts and updates
- 🌙 **Dark/Light Mode** - Theme customization
- 📖 **Content Management** - Blog system with Contentful CMS
- 🔒 **Security** - JWT authentication, CSRF protection, CSP headers

### 🎬 Smart Caption Management (Clipper Studio)

**Status: ✅ COMPLETED - Live Preview Working**

A powerful video caption system for the Clipper Studio that allows users to:

#### ✅ **Completed Features**

- **Live Caption Preview** - Real-time WebVTT caption overlay on videos
- **Font Selection** - 5 professional fonts (Bebas Neue, Montserrat, Anton, Oswald, Roboto)
- **Font Size Control** - Small (1.2rem), Medium (1.5rem), Large (1.8rem)
- **Position Control** - Top, Center, Bottom positioning
- **Live Preview Updates** - Instant visual feedback when changing settings
- **Professional Styling** - High-contrast captions with shadows and backgrounds
- **Responsive Design** - Works across all screen sizes
- **Cross-browser Support** - HTML5 WebVTT standard implementation

#### 🔧 **Technical Implementation**

- **WebVTT Service** - Dynamic caption generation from transcription data
- **Template Store Integration** - Zustand state management for caption settings
- **CSS-based Styling** - `::cue` pseudo-elements for caption appearance
- **API Endpoint** - `/api/clipper-studio/captions/[clipId]` for WebVTT delivery
- **Font Management** - Google Fonts integration with system fallbacks

#### 🎯 **Next Steps** (To Be Implemented)

- **Download with Burned Captions** - FFmpeg integration to permanently embed selected fonts
- **Additional Style Options** - Color themes, outline styles, animation effects
- **Batch Operations** - Apply caption settings to multiple clips
- **Export Formats** - SRT, VTT, and other subtitle format exports

### User Experience

- 📲 **Responsive Design** - Works on desktop and mobile
- ⚡ **Performance Optimized** - 100/92 PageSpeed scores
- 🎭 **Modern UI** - Built with Radix UI and Tailwind CSS
- 🔍 **SEO Optimized** - Full metadata and structured data support

## 🛠 Tech Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: JavaScript (JSX)
- **Styling**: Tailwind CSS + DaisyUI
- **UI Components**: Radix UI
- **Icons**: Lucide React
- **State Management**: Zustand + TanStack Query
- **Forms**: React Hook Form + Zod validation
- **Animations**: Framer Motion

### Backend

- **Runtime**: Node.js
- **API**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js
- **File Storage**: Firebase Storage
- **Queue System**: BullMQ with Redis
- **Email**: Nodemailer
- **Payments**: Stripe

### DevOps & Deployment

- **Deployment**: Vercel
- **Process Manager**: PM2
- **Database Migrations**: migrate-mongo
- **Monitoring**: Built-in logging
- **Performance**: Built-in optimization

### Third-Party Integrations

- **Social Platforms**: OAuth 2.0 APIs for all supported platforms
- **CMS**: Contentful for blog content
- **Analytics**: Custom analytics system
- **Video Processing**: next-video

## 📋 Prerequisites

Before running this application, make sure you have:

- **Node.js** (v18.0.0 or higher)
- **npm** or **yarn**
- **MongoDB** database
- **Redis** server
- **Firebase** project (for file storage)
- **Stripe** account (for payments)
- **Social Platform API Keys** (for OAuth integrations)

## 🚀 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-username/postmore.git
   cd postmore
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` with your configuration (see [Environment Variables](#environment-variables))

4. **Set up the database**

   ```bash
   # Run database migrations
   npm run migrate:up
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:3000`

## 🔧 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Database

```env
MONGODB_URI=mongodb://localhost:27017/postmore
REDIS_URL=redis://localhost:6379
```

### Authentication

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
JWT_SECRET=your-jwt-secret
```

### Firebase Storage

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### Stripe Payments

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Social Platform APIs

```env
# YouTube
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Instagram/Facebook
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# TikTok
TIKTOK_CLIENT_ID=your-tiktok-client-id
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret

# Twitter/X
TWITTER_CLIENT_ID=your-twitter-client-id
TWITTER_CLIENT_SECRET=your-twitter-client-secret

# Add other platform credentials as needed
```

### Email Configuration

```env
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
```

## 🗄 Database Setup

### MongoDB Collections

The application uses the following main collections:

- `users` - User accounts and profiles
- `posts` - Scheduled and published posts
- `socialaccounts` - Connected social media accounts
- `sessions` - User sessions

### Migrations

Run database migrations:

```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:up

# Rollback migrations (if needed)
npm run migrate:down
```

## 🏃‍♂️ Running the Application

### Development Mode

```bash
# Start the main application
npm run dev

# Start background workers (in separate terminals)
npm run worker
npm run standalone-worker
```

### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm run start

# Using PM2 (recommended for production)
npm run pm2-start
```

### PM2 Commands

```bash
npm run pm2-start     # Start all processes
npm run pm2-stop      # Stop all processes
npm run pm2-restart   # Restart all processes
npm run pm2-status    # Check process status
npm run pm2-logs      # View logs
```

## 📁 Project Structure

```
postmore/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── posts/                # Post management
│   │   ├── social-accounts/      # Social account management
│   │   ├── checkout/             # Stripe integration
│   │   └── webhooks/             # Platform webhooks
│   ├── components/               # Reusable React components
│   │   ├── HomePage/             # Landing page components
│   │   ├── ui/                   # UI component library
│   │   └── posts/                # Post-related components
│   ├── context/                  # React Context providers
│   ├── dashboard/                # Main dashboard pages
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   │   ├── api/                  # API service integrations
│   │   ├── db/                   # Database connections
│   │   ├── queues/               # Background job queues
│   │   └── store/                # State management
│   ├── models/                   # Database schemas
│   └── providers/                # App-level providers
├── public/                       # Static assets
├── scripts/                      # Deployment scripts
└── migrations/                   # Database migrations
```

## 🔌 API Documentation

### Authentication

- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh tokens

### Posts Management

- `GET /api/posts` - Get user posts
- `POST /api/posts` - Create new post
- `PUT /api/posts/[id]` - Update post
- `DELETE /api/posts/[id]` - Delete post
- `POST /api/posts/submit` - Submit post for publishing

### Social Accounts

- `GET /api/social-accounts` - Get connected accounts
- `POST /api/social-accounts` - Connect new account
- `DELETE /api/social-accounts/[id]` - Disconnect account

### Platform-Specific Endpoints

- `POST /api/auth/youtube/connect` - Connect YouTube
- `POST /api/auth/instagram/connect` - Connect Instagram
- `POST /api/auth/tiktok/connect` - Connect TikTok
- And more for each supported platform...

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically with git push

### Manual Deployment

1. Build the application: `npm run build`
2. Set up production environment variables
3. Start with PM2: `npm run pm2-start`
4. Configure reverse proxy (nginx/Apache)

### Environment-Specific Considerations

- **Production**: Use PM2 for process management
- **Staging**: Enable debug logging
- **Development**: Hot reload with turbopack

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow ESLint configuration
- Write meaningful commit messages
- Test your changes thoroughly
- Update documentation as needed

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For support and questions:

- **Email**: support@postmoo.re
- **Documentation**: [docs.postmoo.re](https://docs.postmoo.re)
- **GitHub Issues**: For bug reports and feature requests

## 🎉 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components by [Radix UI](https://radix-ui.com/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons by [Lucide](https://lucide.dev/)

---

**Made with ❤️ by the PostMoore Team**
