"use node";

import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { getStreamVideo } from "../lib/stream-video.server";
import { generateAvatarUri } from "../lib/avartar";

export const generateToken = action({
  args: {
    userId: v.id("User"),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = String(args.userId);
    const user = await ctx.runQuery(api.User.GetUserById, {
      userId: args.userId,
    });
    if (!user) {
      throw new Error("User not found");
    }

    const name = args.name ?? user.name ?? "User";
    const image =
      args.image ??
      generateAvatarUri({
        seed: name,
        variant: "initials",
      });

    await getStreamVideo().upsertUsers([
      {
        id: userId,
        name,
        role: "admin",
        image,
      },
    ]);

    const expirationTime = Math.floor(Date.now() / 1000) + 3600;

    return getStreamVideo().generateUserToken({
      user_id: userId,
      exp: expirationTime,
    });
  },
});

export const ensureCallReady = action({
  args: {
    userId: v.id("User"),
    conversationId: v.id("Conversations"),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.runQuery(api.Conversations.GetConversationDetails, {
      userId: args.userId,
      conversationId: args.conversationId,
    });

    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const persona = await ctx.runQuery(api.Persona.GetPersonaDetails, {
      userId: args.userId,
      personaId: conversation.personaId,
    });

    if (!persona) {
      throw new Error("Persona not found");
    }

    await getStreamVideo().upsertUsers([
      {
        id: String(args.userId),
        name: conversation.userName ?? "User",
        role: "admin",
        image: generateAvatarUri({
          seed: conversation.userName ?? "User",
          variant: "initials",
        }),
      },
      {
        id: String(conversation.personaId),
        name: persona.name ?? "Persona",
        role: "user",
        image: generateAvatarUri({
          seed: persona.name ?? "Persona",
          variant: "botttsNeutral",
        }),
      },
    ]);

    const call = getStreamVideo().video.call("default", String(args.conversationId));

    try {
      await call.create({
        data: {
          created_by_id: String(args.userId),
          custom: {
            conversationId: String(args.conversationId),
            conversationName: conversation.name ?? "",
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isAlreadyExists =
        message.toLowerCase().includes("already exists") ||
        message.toLowerCase().includes("call already exists") ||
        message.toLowerCase().includes("exists");

      if (!isAlreadyExists) {
        throw error;
      }
    }

    return { ok: true };
  },
});

export const setupStreamForConversation = internalAction({
  args: {
    userId: v.id("User"),
    personaId: v.id("Persona"),
    conversationId: v.id("Conversations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const [user, persona] = await Promise.all([
      ctx.runQuery(api.User.GetUserById, { userId: args.userId }),
      ctx.runQuery(api.Persona.GetPersonaDetails, {
        userId: args.userId,
        personaId: args.personaId,
      }),
    ]);

    if (!user) {
      throw new Error("User not found");
    }
    if (!persona) {
      throw new Error("Persona not found");
    }

    const call = getStreamVideo().video.call(
      "default",
      String(args.conversationId)
    );
    try {
      await call.create({
        data: {
          created_by_id: String(args.userId),
          custom: {
            conversationId: String(args.conversationId),
            conversationName: args.name,
          },
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isAlreadyExists =
        message.toLowerCase().includes("already exists") ||
        message.toLowerCase().includes("call already exists") ||
        message.toLowerCase().includes("exists");

      if (!isAlreadyExists) {
        throw error;
      }
    }

    await getStreamVideo().upsertUsers([
      {
        id: String(args.userId),
        name: user.name ?? "User",
        role: "admin",
        image: generateAvatarUri({
          seed: user.name ?? "User",
          variant: "initials",
        }),
      },
      {
        id: String(args.personaId),
        name: persona.name ?? "Persona",
        role: "user",
        image: generateAvatarUri({
          seed: persona.name ?? "Persona",
          variant: "botttsNeutral",
        }),
      },
    ]);
  },
});
