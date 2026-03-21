'use client';

import React, { useEffect, useState } from 'react';
import { api } from "@/convex/_generated/api";
import { useUser } from "@stackframe/stack";
import { useMutation, useQuery } from "convex/react";
import { UserContext } from './_context/UserContext';

export default function AuthProvider({ children }) {
    const user = useUser();
    const CreateUser = useMutation(api.User.CreateUser);
    const [createdUser, setCreatedUser] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const userData = useQuery(api.User.GetUserByEmail, user ? { email: user.primaryEmail ?? "" } : "skip",);

    useEffect(() => {
        if (!user || userData !== null || isCreating) {return;}
        if (!user.primaryEmail) {return;}

        setIsCreating(true);
        CreateUser({
            name: user.displayName ?? "User",
            email: user.primaryEmail,
        })
            .then((result) => {
                setCreatedUser(result);
            })
            .finally(() => {
                setIsCreating(false);
            });
    }, [user, userData, isCreating, CreateUser]);

    return (
        <div>
            <UserContext.Provider
                value={{
                    user,
                    userData: userData ?? createdUser,
                    setUserData: setCreatedUser,
                }}
            >
                {children}
            </UserContext.Provider>
        </div>
    );
}
