import { Suspense } from "react";
import TugDayView from "@/components/tug/TugDayView";

export default async function TugPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<main className="page" />}>
      <TugDayView id={decodeURIComponent(id)} />
    </Suspense>
  );
}
