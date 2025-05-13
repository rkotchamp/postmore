/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https://cdn.bsky.app https://*.twitter.com https://*.twimg.com https://*.instagram.com https://*.fbcdn.net https://*.facebook.com https://*.tiktokcdn.com https://*.cdninstagram.com https://*.firebasestorage.googleapis.com;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      media-src 'self' blob: https://*.firebasestorage.googleapis.com;
      connect-src 'self' https://*.firebasestorage.googleapis.com https://firebasestorage.googleapis.com https://*.googleapis.com https://firestore.googleapis.com;
    `;

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\s{2,}/g, " ").trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
