import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import Nav from "@/components/Nav";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tug fleet replay",
  description:
    "Real Port of Los Angeles tug traffic replayed as hybrid-electric telemetry. Independent project.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050607",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={interTight.variable}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
