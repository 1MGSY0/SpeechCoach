'use client';

import React, { Suspense } from 'react';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import AuthProvider from './auth_provider';
import { LoadingState } from '@/components/loading-state';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export default function DatabaseProvider({ children }) {
    return (
        <Suspense fallback={<LoadingState title="Loading..." description="Connecting to the database." />}>
            <ConvexProvider client={convex}>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </ConvexProvider>
        </Suspense>
    );
}