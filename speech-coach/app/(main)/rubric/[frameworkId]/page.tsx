import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LoadingState } from "@/components/loading-state";
import { RubricIdView } from "../_components/rubric-id-view";

interface Props {
  params: Promise<{ frameworkId: string }>;
}

export default async function Page({ params }: Props) {
  const { frameworkId } = (await params) ?? {};

  if (!frameworkId || typeof frameworkId !== "string") {
    notFound();
  }

  const rubricConvexId = frameworkId as Id<"AssessmentFramework">;

  const preloadedRubric = await preloadQuery(
    api.AssessmentFramework.GetFrameworkWithStructure,
    {
      frameworkId: rubricConvexId,
    }
  );

  return (
    <Suspense
      fallback={<LoadingState title="Loading..." description="Loading rubric." />}
    >
      <RubricIdView preloadedRubric={preloadedRubric} />
    </Suspense>
  );
}