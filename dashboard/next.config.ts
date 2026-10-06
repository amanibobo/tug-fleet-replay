import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The dashboard is one package inside a larger repo; keep Turbopack rooted here.
  turbopack: { root: path.join(__dirname) },
  // The Rerun web viewer owns a wgpu device per mount. React's dev-only double mount under
  // strict mode creates two devices for one canvas and logs wgpu validation errors, so the
  // dev server runs without strict mode. Production builds never double-mount.
  reactStrictMode: false,
  // The console moved under /app, the About page became the landing, and the paper page is the landing.
  async redirects() {
    return [
      { source: "/tugs/:id", destination: "/app/tugs/:id", permanent: true },
      { source: "/about", destination: "/", permanent: true },
      { source: "/paper", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
