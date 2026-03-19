import { defineSchema, defineTable } from "convex/server";
import {v} from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.string(),
        email: v.string(),
        credits: v.optional(v.number()),
    }),
    ConvoRoom: defineTable({
        persona: v.string(),
        scenario: v.string(),
        conversation: v.optional(v.any()),
    }),
});