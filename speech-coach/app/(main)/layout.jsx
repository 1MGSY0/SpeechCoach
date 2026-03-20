import React from 'react'
import AppHeader from './_components/AppHeader'

function DashboardLayout({ children }) {
  return (
    <div>
        <AppHeader />
        <div className='p-10 mt-8 md:px-20 lg:px-32 xl:px-48 2xl:px-96'>
            {children}
        </div>
    </div>
  )
}

export default DashboardLayout
