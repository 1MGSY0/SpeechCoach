import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type RubricsGetMany =
  FunctionReturnType<typeof api.AssessmentFramework.GetAllAssessmentFrameworks>;

export type RubricGetOne =
  FunctionReturnType<typeof api.AssessmentFramework.GetFrameworkWithStructure>;