import React, { Suspense } from 'react'
import AppHeader from './_components/AppHeader'
import Providers from '../providers'
import { LoadingState } from '@/components/loading-state'

function DashboardLayout({ children }) {
  return (
      <Providers>
        <div>
            <AppHeader />
            <Suspense
              fallback={
                <LoadingState title="Loading..." description="Loading your workspace." />
              }
            >
              <div className='p-10 mt-8 md:px-20 lg:px-32 xl:px-48 2xl:px-96'>
                {children}
              </div>
            </Suspense>
        </div>
      </Providers>
  )
}

export default DashboardLayout
