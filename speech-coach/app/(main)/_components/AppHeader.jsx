import React from 'react'
import Image from 'next/image'
import { UserButton } from '@stackframe/stack'

function AppHeader() {
  return (
    <div className='p-3 shadow-lg flex items-center justify-between'>
        <Image src="/logo.svg" alt="Logo" width={50} height={50} className='h-[50px] w-[auto]'/>
        <h2 className='text-xl font-bold text-primary'>Speech Coach</h2>
        <UserButton />
      
    </div>
  )
}

export default AppHeader
