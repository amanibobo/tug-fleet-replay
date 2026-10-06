import type { Viewport } from "next";
import localFont from "next/font/local";

// Excalifont, the hand-written face Excalidraw uses, for the figure labels on this page only.
const excalifont = localFont({
  src: "../../../public/fonts/Excalifont-Regular.woff2",
  variable: "--font-excalifont",
  display: "swap",
  weight: "400",
});

// The docs page shares the landing color; the browser chrome matches it until the theme switches.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f3f1ea",
};

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  return (
    <div data-landing className={excalifont.variable}>
      {children}
    </div>
  );
}
