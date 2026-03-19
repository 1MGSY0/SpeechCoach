"use client";

import React from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button';
import { useUser } from '@stackframe/stack'
import { ServiceLists } from '@/services/Options';
import { BlurFade } from '@/components/ui/blur-fade';
import UserInputDialog from './UserInputDialog';

function FeatureAssistants() {
    const user = useUser();
  return (
    <div>
        <div className='flex justify-between items-center mb-10'>
            <div>       
                <h2 className='font-medium text-gray-500'>Dashboard</h2>
                <h2 className='text-3xl font-bold'>Hi, {user?.displayName}!</h2>  
            </div>
            <Button>Profile</Button>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mt-10'>
            {ServiceLists.map((service, index) => (
                <BlurFade key={service.icon} delay={0.25 + index * 0.05} inView>
                    <div key={index} className='p-3 bg-secondary border rounded-3xl flex flex-col justify-center items-center cursor-pointer hover:bg-secondary/20 hover:translate-y-[-3px] transition'>
                        <UserInputDialog serviceOption={service}>
                            <div key={index} className='flex flex-col justify-center items-center'>
                                <Image src={service.icon} alt={service.name} width={100} height={100} className='h-[70px] w-[auto]' />
                                <h2 className='font-semibold mt-3'>{service.name}</h2>
                            </div>
                        </UserInputDialog>
                    </div>
                    
                </BlurFade>
            ))}

        </div>

    </div>
  )
}

export default FeatureAssistants
