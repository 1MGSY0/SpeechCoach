import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreateNewRoom = mutation({
    args: {
        persona: v.string(),
        scenario: v.string(),
        conversation: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const result = await ctx.db.insert('ConvoRoom', {
            persona: args.persona,
            scenario: args.scenario,
            conversation: args.conversation,
        });

        return result;
    }
})

export const GetRoomDetails = query({
    args: {
        roomId: v.id('ConvoRoom'),  
    },
    handler: async (ctx, args) => {
        const room = await ctx.db.get(args.roomId);
        return room;
    }
});
