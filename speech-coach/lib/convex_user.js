import "server-only";

import { cache } from "react";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { stackServerApp } from "@/stack/server";

export const getServerContext = cache(async () => {
  const stackUser = await stackServerApp.getUser({ or: "redirect" });
  const email = stackUser.primaryEmail ?? "";

  const existingUser = await fetchQuery(api.User.GetUserByEmail, {
    email,
  });

  const convexUser = existingUser ?? await fetchMutation(api.User.CreateUser, {
    name: stackUser.displayName ?? "User",
    email,
  });

  return {
    stackUser,
    convexUser,
    convexUserId: convexUser._id,
  };
});

export async function getServerUserAndConvexUser() {
  const { stackUser, convexUser } = await getServerContext();
  return { stackUser, convexUser };
}
