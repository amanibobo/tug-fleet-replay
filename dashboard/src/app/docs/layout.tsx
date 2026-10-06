import type { Viewport } from "next";
import localFont from "next/font/local";

// Excalifont, the hand-written face Excalidraw uses, for the figure labels on this page only.
const excalifont = localFont({
  src: "../../../public/fonts/Excalifont-Regular.woff2",
  variable: "--font-excalifont",
  display: "swap",
  weight: "400",
});

// The docs page is black like the landing; the browser chrome should match it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function DocsLayout({ children }: LayoutProps<"/docs">) {
  return (
    <div data-landing className={excalifont.variable}>
      {children}
    </div>
  );
}
