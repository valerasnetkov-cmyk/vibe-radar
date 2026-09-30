import type { NextConfig } from "next";

// Production baseline headers that cannot break Next.js rendering.
// Content-Security-Policy stays deferred (Next.js inline runtime would
// need a nonce architecture first). HSTS is owned by Nginx/TLS, which is
// the only layer that can guarantee HTTPS.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
