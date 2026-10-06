import type { Metadata } from "next";
import { Suspense } from "react";
import FleetConsole from "@/components/fleet/FleetConsole";

export const metadata: Metadata = {
  title: "Fleet console · Tugboard",
};

export default function ConsolePage() {
  return (
    <Suspense fallback={<main className="page" />}>
      <FleetConsole />
    </Suspense>
  );
}
