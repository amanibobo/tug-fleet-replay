import type { Viewport } from "next";
import PaperLanding from "@/components/paper/PaperLanding";

// The landing is the paper page; the browser chrome matches its light color until the theme switches.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f1ea",
};

export default function Home() {
  return <PaperLanding />;
}
