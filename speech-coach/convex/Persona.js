import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new Persona document
export const CreatePersona = mutation({
    args: {
        name: v.string(),
        userId: v.string(),
        instructions: v.string(),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        const personaId = await ctx.db.insert("Persona", {
            name: args.name,
            userId: args.userId,
            instructions: args.instructions,
            createdAt: now,
            updatedAt: now,
        });

        return personaId;
    },
});

// Update an existing Persona
export const UpdatePersona = mutation({
    args: {
        personaId: v.id("Persona"),
        userId: v.string(),
        name: v.optional(v.string()),
        instructions: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { personaId, userId, name, instructions } = args;

        const existing = await ctx.db.get(personaId);
        if (!existing || existing.userId !== userId) {
            throw new Error("Persona not found");
        }

        const update = {
            updatedAt: new Date().toISOString(),
        };

        if (name !== undefined) {
            update.name = name;
        }
        if (instructions !== undefined) {
            update.instructions = instructions;
        }

        await ctx.db.patch(personaId, update);
        return await ctx.db.get(personaId);
    },
});

// Remove a Persona, scoped to a user
export const RemovePersona = mutation({
    args: {
        personaId: v.id("Persona"),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.personaId);
        if (!existing || existing.userId !== args.userId) {
            throw new Error("Persona not found");
        }

        await ctx.db.delete(args.personaId);
        return existing;
    },
});

// Get details for a single Persona plus its conversation count
export const GetPersonaDetails = query({
    args: {
        personaId: v.id("Persona"),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const persona = await ctx.db.get(args.personaId);
        if (!persona || persona.userId !== args.userId) {
            return null;
        }

        const conversations = await ctx.db
            .query("Conversations")
            .filter(q => q.eq(q.field("personaId"), args.personaId))
            .collect();

        const conversationCount = conversations.length;

        return { ...persona, conversationCount };
    },
});

// List Personas for a user with optional text search and conversation counts
export const ListPersonas = query({
    args: {
        userId: v.string(),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const personas = await ctx.db
            .query("Persona")
            .filter(q => q.eq(q.field("userId"), args.userId))
            .collect();

        const filtered = args.search
            ? personas.filter(p =>
                    p.name.toLowerCase().includes(args.search.toLowerCase())
                )
            : personas;
        
        // throw new Error("Error fetching personas");

        return filtered.map((p, index) => ({
            ...p,
            personaCount: index + 1,
        }));
    },
});
