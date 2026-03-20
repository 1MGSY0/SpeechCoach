'use client';

import React, { useEffect, useState } from 'react';
import { api } from "@/convex/_generated/api";
import { useUser } from "@stackframe/stack";
import { useMutation } from "convex/react";
import { UserContext } from './_context/UserContext';

export default function AuthProvider({ children }) {
    const user = useUser();
    const CreateUser = useMutation(api.User.CreateUser);
    const [userData, setUserData] = useState();

    useEffect(() => {
        console.log("User: ", user);
        if (user) {
            CreateNewUser();
        }
    }, [user]);

    const CreateNewUser = async () => {
        const result = await CreateUser({
            userId: user.id,
            name: user.displayName,
            email: user.primaryEmail,
        });
        console.log(result);
        setUserData(result);
    }

    return (
        <div>
            <UserContext.Provider
                value={{
                    user,
                    userId: user?.id ?? null,
                    userData,
                    setUserData,
                }}
            >
                {children}
            </UserContext.Provider>
        </div>
    );
}
