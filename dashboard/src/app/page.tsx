import type { Viewport } from "next";
import Landing from "@/components/landing/Landing";

// The landing is the one black page; the browser chrome should match it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function Home() {
  return <Landing />;
}
