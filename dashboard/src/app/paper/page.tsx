import type { Metadata, Viewport } from "next";
import PaperLanding from "@/components/paper/PaperLanding";

export const metadata: Metadata = {
  title: "Tugboard",
  description: "Fleet replay for hybrid-electric tugs",
};

export const viewport: Viewport = { themeColor: "#f3f1ea" };

export default function PaperPage() {
  return <PaperLanding />;
}
