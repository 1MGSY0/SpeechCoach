import React, { Suspense } from "react";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

import RubricView from "./_components/rubric_view";
import { RubricListHeader } from "./_components/rubric-list-header";
import { LoadingState } from "@/components/loading-state";

export default async function Page() {
  const preloadedRubrics = await preloadQuery(
    api.AssessmentFramework.GetAllAssessmentFrameworks,
    {}
  );

  return (
    <>
      <RubricListHeader />
      <Suspense
        fallback={
          <LoadingState title="Loading..." description="Loading rubrics." />
        }
      >
        <RubricView preloadedRubrics={preloadedRubrics} />
      </Suspense>
    </>
  );
}