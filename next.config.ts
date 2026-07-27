import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
};

// next-pwa injects a webpack() config function, which conflicts with Next.js 16's
// Turbopack-by-default dev server. Only wrap with PWA for production builds (which
// run with --webpack); `next dev` gets the plain config and stays on Turbopack.
const isDev = process.env.NODE_ENV === "development";

export default isDev
  ? nextConfig
  : withPWA({
      dest: "public",
      // Registered manually in a client component (src/components/ServiceWorkerRegister.tsx)
      // since next-pwa's auto-register targets the Pages Router.
      register: false,
      skipWaiting: true,
    })(nextConfig);
