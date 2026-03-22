import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new ConvoRoom document
export const CreateNewRoom = mutation({
    args: {
        persona: v.string(),
        scenario: v.string(),
        conversation: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const roomId = await ctx.db.insert("ConvoRoom", {
            persona: args.persona,
            scenario: args.scenario,
            conversation: args.conversation ?? null,
        });

        return roomId;
    },
});

// Get ConvoRoom details
export const GetRoomDetails = query({
    args: {
        roomId: v.id("ConvoRoom"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.roomId);
    },
});
