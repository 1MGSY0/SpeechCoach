import "server-only";

import { fetchMutation, fetchQuery, preloadQuery } from "convex/nextjs";

const internalConvexUrl =
  process.env.CONVEX_URL_INTERNAL ?? process.env.NEXT_PUBLIC_CONVEX_URL;

const convexOptions = internalConvexUrl
  ? {
      url: internalConvexUrl,
      skipConvexDeploymentUrlCheck: true,
    }
  : undefined;

function mergeOptions(options?: Record<string, unknown>) {
  if (!convexOptions) {
    return options;
  }

  return {
    ...(options ?? {}),
    ...convexOptions,
  };
}

export function serverFetchQuery(query: any, args?: any, options?: Record<string, unknown>) {
  return fetchQuery(query, args, mergeOptions(options));
}

export function serverFetchMutation(
  mutation: any,
  args?: any,
  options?: Record<string, unknown>
) {
  return fetchMutation(mutation, args, mergeOptions(options));
}

export function serverPreloadQuery(
  query: any,
  args?: any,
  options?: Record<string, unknown>
) {
  return preloadQuery(query, args, mergeOptions(options));
}
