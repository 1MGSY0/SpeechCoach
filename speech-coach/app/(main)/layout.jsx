import React, { Suspense } from 'react'
import AppHeader from './_components/AppHeader'
import Providers from '../providers'
import { LoadingState } from '@/components/loading-state'

function DashboardLayout({ children }) {
  return (
    <Suspense
      fallback={
        <LoadingState title="Loading..." description="Loading your workspace." />
      }
    >
      <Providers>
        <div>
            <AppHeader />
            <div className='p-10 mt-8 md:px-20 lg:px-32 xl:px-48 2xl:px-96'>
                {children}
            </div>
        </div>
      </Providers>
    </Suspense>
  )
}

export default DashboardLayout
