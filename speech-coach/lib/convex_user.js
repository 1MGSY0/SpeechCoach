import "server-only";

import { cache } from "react";
import { api } from "@/convex/_generated/api";
import { serverFetchMutation, serverFetchQuery } from "@/lib/convex-server";
import { stackServerApp } from "@/stack/server";

export const getServerContext = cache(async () => {
  const stackUser = await stackServerApp.getUser({ or: "redirect" });
  const email = stackUser.primaryEmail ?? "";

  const existingUser = await serverFetchQuery(api.User.GetUserByEmail, {
    email,
  });

  const convexUser = existingUser ?? await serverFetchMutation(api.User.CreateUser, {
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
