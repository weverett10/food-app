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

export default withPWA({
  dest: "public",
  // Registered manually in a client component (src/components/ServiceWorkerRegister.tsx)
  // since next-pwa's auto-register targets the Pages Router.
  register: false,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
