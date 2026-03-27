/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as AssessmentCategory from "../AssessmentCategory.js";
import type * as AssessmentCriterion from "../AssessmentCriterion.js";
import type * as AssessmentFramework from "../AssessmentFramework.js";
import type * as ConversationAssessment from "../ConversationAssessment.js";
import type * as ConversationCriterionResult from "../ConversationCriterionResult.js";
import type * as Conversations from "../Conversations.js";
import type * as Persona from "../Persona.js";
import type * as User from "../User.js";
import type * as conversations_stream from "../conversations_stream.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  AssessmentCategory: typeof AssessmentCategory;
  AssessmentCriterion: typeof AssessmentCriterion;
  AssessmentFramework: typeof AssessmentFramework;
  ConversationAssessment: typeof ConversationAssessment;
  ConversationCriterionResult: typeof ConversationCriterionResult;
  Conversations: typeof Conversations;
  Persona: typeof Persona;
  User: typeof User;
  conversations_stream: typeof conversations_stream;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
