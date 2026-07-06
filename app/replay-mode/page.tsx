import { Suspense } from "react";
import { ReplayModePage } from "@/components/replay-mode-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ReplayModePage />
    </Suspense>
  );
}
