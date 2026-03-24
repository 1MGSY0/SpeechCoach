import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const CreateUser=mutation({
    args:{
        name:v.string(),
        email:v.string(),

    }, 
    handler:async(ctx,args)=>{
        // if user with email already exists, return that user
        const userData=await ctx.db.query("User")
        .filter(q=>q.eq(q.field('email'),args.email))
        .collect();
        
        //if not add user
        if(userData?.length==0)
        {
            const data={
                name:args.name,
                email:args.email,
            }
            const result=await ctx.db.insert("User",{
                ...data
            });
            console.log("User created with id: ",result);
            return await ctx.db.get(result);
        }
        return userData[0];
    }
    
})

export const GetUserByEmail = query({
    args: {
        email: v.string(),
    },
    handler: async (ctx, args) => {
        const matches = await ctx.db
            .query("User")
            .filter(q => q.eq(q.field("email"), args.email))
            .collect();

        return matches[0] ?? null;
    },
});

export const GetUserById = query({
    args: {
        userId: v.id("User"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});