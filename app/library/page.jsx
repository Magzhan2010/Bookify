import { Suspense } from "react";

import SkeletonGrid from "../component/skeleton";
import Library from "../component/library";
export default function LibraryPage() {
  return (
    <Suspense fallback={<SkeletonGrid />}>
      <Library />
    </Suspense>
  );
}