import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321"
const supabaseOrigin = new URL(supabaseUrl).origin

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; frame-src blob: data:; frame-ancestors 'self'; img-src 'self' data: blob:; connect-src 'self' https://apihub.agnes-ai.com https://api.tavily.com ${supabaseOrigin} ws://localhost:54321;`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
