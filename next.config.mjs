import { withNextVideo } from "next-video/process";
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["firebasestorage.googleapis.com", "storage.googleapis.com"],
  },
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://cdn.bsky.app https://*.twitter.com https://*.twimg.com https://*.instagram.com https://*.fbcdn.net https://*.facebook.com https://*.tiktokcdn.com https://*.cdninstagram.com https://*.firebasestorage.googleapis.com https://storage.googleapis.com;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      media-src 'self' blob: https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com;
      connect-src 'self' https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://*.googleapis.com https://firestore.googleapis.com https://storage.googleapis.com;
    `;

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\s{2,}/g, " ").trim(),
          },
          // Add CORS headers to support Firebase Storage videos
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "X-Requested-With, Content-Type, Accept, Origin, Range",
          },
        ],
      },
    ];
  },
};

export default withNextVideo(nextConfig);
