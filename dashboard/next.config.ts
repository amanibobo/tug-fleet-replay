import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The dashboard is one package inside a larger repo; keep Turbopack rooted here.
  turbopack: { root: path.join(__dirname) },
};

export default nextConfig;
