import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "driver.js/dist/driver.css";
import "./globals.css";
import Nav from "@/components/Nav";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";

// Geist throughout; swap the family here.
const sans = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tugboard",
  description: "Fleet replay for hybrid-electric tugs",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <OnboardingProvider>
          <Nav />
          {children}
        </OnboardingProvider>
      </body>
    </html>
  );
}
