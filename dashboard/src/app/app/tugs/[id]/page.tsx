import type { Metadata } from "next";
import { Suspense } from "react";
import TugDayView from "@/components/tug/TugDayView";

export const metadata: Metadata = {
  title: "Tug day · Tugboard",
};

export default async function TugPage({ params }: PageProps<"/app/tugs/[id]">) {
  const { id } = await params;
  return (
    <Suspense fallback={<main className="page" />}>
      <TugDayView id={decodeURIComponent(id)} />
    </Suspense>
  );
}
