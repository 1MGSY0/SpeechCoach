import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const CreateUser=mutation({
    args:{
        userId:v.string(),
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
            const {userId, name,email}=args;
            const data={
                userId:args.userId,
                name:args.name,
                email:args.email,
            }
            const result=await ctx.db.insert("User",{
                ...data
            });
            console.log("User created with id: ",result);
            return data;
        }
        return userData[0];
    }
    
})