import { withNextVideo } from "next-video/process";
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  },
  images: {
    domains: [
      "firebasestorage.googleapis.com",
      "storage.googleapis.com",
      "lh3.googleusercontent.com",
      "p16-pu-sign-no.tiktokcdn-eu.com",
    ],
  },
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://cdn.bsky.app https://*.twitter.com https://*.twimg.com https://*.instagram.com https://*.fbcdn.net https://*.facebook.com https://*.tiktokcdn.com https://*.tiktokcdn-eu.com https://*.cdninstagram.com https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.googleusercontent.com;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self' https://checkout.stripe.com;
      frame-ancestors 'none';
      frame-src https://checkout.stripe.com https://js.stripe.com;
      media-src 'self' blob: https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://storage.googleapis.com;
      connect-src 'self' https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://*.googleapis.com https://firestore.googleapis.com https://storage.googleapis.com https://api.stripe.com;
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
