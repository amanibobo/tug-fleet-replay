import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "maplibre-gl/dist/maplibre-gl.css";
import "driver.js/dist/driver.css";
import "./globals.css";
import Nav from "@/components/Nav";
import { OnboardingProvider } from "@/components/onboarding/OnboardingProvider";
import { PAGE_COLOR, THEME_INIT_SCRIPT } from "@/components/theme/theme";

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

// Light by default; the theme store rewrites this meta tag when the theme switches.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: PAGE_COLOR.light,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is rewritten by the inline script before paint, hence suppressHydrationWarning.
    <html lang="en" className={`${sans.variable} ${mono.variable}`} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <OnboardingProvider>
          <Nav />
          {children}
        </OnboardingProvider>
      </body>
    </html>
  );
}
