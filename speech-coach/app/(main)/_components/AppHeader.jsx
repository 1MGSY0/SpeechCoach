import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { UserButton } from '@stackframe/stack'

function AppHeader() {
  return (
    <div className='p-3 shadow-lg flex items-center justify-between'>
        <Link href="/dashboard" aria-label="Go to dashboard">
          <Image src="/logo.svg" alt="Logo" width={50} height={50} priority className='h-50px w-auto'/>
        </Link>
        <h2 className='text-xl font-bold text-primary'>Speech Coach</h2>
        <UserButton />
      
    </div>
  )
}

export default AppHeader
