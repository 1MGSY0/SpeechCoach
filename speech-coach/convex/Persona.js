import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
    DEFAULT_PAGE,
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,
    MIN_PAGE_SIZE,
} from "../constants";


// Create a new Persona document
export const CreatePersona = mutation({
    args: {
        userId: v.id("User"),
        name: v.string(),
        instructions: v.string(),
    },
    handler: async (ctx, args) => {
        const now = new Date().toISOString();

        const personaId = await ctx.db.insert("Persona", {
            name: args.name,
            userId: args.userId,
            instructions: args.instructions,
            updatedAt: now,
        });

        return personaId;
    },
});

// Update an existing Persona
export const UpdatePersona = mutation({
    args: {
        userId: v.id("User"),
        personaId: v.id("Persona"),
        name: v.optional(v.string()),
        instructions: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { personaId, name, instructions } = args;

        const existing = await ctx.db.get(personaId);
        if (!existing || existing.userId !== args.userId) {
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
        userId: v.id("User"),
        personaId: v.id("Persona"),
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
        userId: v.id("User"),
        personaId: v.id("Persona"),
    },
    handler: async (ctx, args) => {
        const persona = await ctx.db.get(args.personaId);
        if (!persona || persona.userId !== args.userId) {
            return null;
        }

        const conversations = await ctx.db
            .query("Conversations")
            .withIndex("by_personaId", (q) => q.eq("personaId", args.personaId))
            .collect();

        const conversationCount = conversations.length;

        return { ...persona, conversationCount };
    },
});

// List Personas for a user with optional text search and conversation counts
export const ListPersonas = query({
    args: {
        userId: v.id("User"),
        page: v.optional(v.number()),
        pageSize: v.optional(v.number()),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const page = args.page ?? DEFAULT_PAGE;
        const rawPageSize = args.pageSize ?? DEFAULT_PAGE_SIZE;
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, rawPageSize));
        const search = args.search?.trim().toLowerCase();
        const hasSearch = Boolean(search);

/*         console.log("ListPersonas args", {
            userId: args.userId,
            page,
            pageSize,
            search: args.search ?? null,
        }); */

        const personas = await ctx.db
            .query("Persona")
            .withIndex("by_userId", (q) => q.eq("userId", args.userId))
            .collect();


        const filtered = hasSearch
            ? personas.filter((p) => p.name.toLowerCase().includes(search))
            : personas;

/*         console.log("ListPersonas filtered", {
            hasSearch,
            count: filtered.length,
        }); */

        filtered.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));

        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.max(1, Math.min(page, totalPages));
        const start = (safePage - 1) * pageSize;
        const items = filtered
            .slice(start, start + pageSize)
            .map((p, index) => ({
                ...p,
                personaCount: start + index + 1,
            }));

/*         console.log("ListPersonas page", {
            total,
            totalPages,
            safePage,
            items: items.length,
        }); */

        return {
            items,
            total,
            totalPages,
        };
    },
});
