import React, { Suspense } from 'react'
import AppHeader from './_components/AppHeader'
import Providers from '../providers'
import { LoadingState } from '@/components/loading-state'

function DashboardLayout({ children }) {
  return (
      <Providers>
        <div className="min-h-screen bg-slate-100">
            <AppHeader />
            <Suspense
              fallback={
                <LoadingState title="Loading..." description="Loading your workspace." />
              }
            >
              <div className="mx-auto mt-8 w-full max-w-[min(80vw,1600px)] px-4 py-10 sm:px-6 lg:px-8">
                {children}
              </div>
            </Suspense>
        </div>
      </Providers>
  )
}

export default DashboardLayout
