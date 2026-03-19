import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const CreateUser=mutation({
    args:{
        name:v.string(),
        email:v.string(),

    }, 
    handler:async(ctx,args)=>{
        // if user with email already exists, return that user
        const userData=await ctx.db.query("users")
        .filter(q=>q.eq(q.field('email'),args.email))
        .collect();
        
        //if not add user
        if(userData?.length==0)
        {
            const {name,email}=args;
            const data={
                name:args.name,
                email:args.email,
                credits:10
            }
            const result=await ctx.db.insert("users",{
                ...data
            });
            console.log("User created with id: ",result);
            return data;
        }
        return userData[0];
    }
    
})