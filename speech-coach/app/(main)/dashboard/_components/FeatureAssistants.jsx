"use client";

import React from 'react'
import Image from 'next/image'
import { useUser } from '@stackframe/stack'
import { ServiceLists } from '@/services/Options';
import { BlurFade } from '@/components/ui/blur-fade';
import { useRouter } from 'next/navigation';

function DashboardIntro() {
    const user = useUser();

    return (
        <div className='relative'>
            <p className='text-xs font-semibold uppercase tracking-[0.22em] text-primary/80'>Speech Practice Workspace</p>
            <h2 className='mt-3 text-3xl font-bold text-primary'>Hi, {user?.displayName}!</h2>
            <div className='mt-5 space-y-6'>
                <p className='max-w-full text-sm leading-6 text-slate-600'>
                    <span className='inline-block rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm'>
                        Speech Coach
                    </span>{" "}
                    helps you practice realistic conversations, structure sessions with personas and rubrics, and review feedback after each run.
                </p>
                <div className='grid gap-4 text-sm text-slate-600 sm:grid-cols-3'>
                    <div className='rounded-2xl border border-white/70 bg-white/75 px-5 py-4 backdrop-blur-sm'>
                        <p className='font-medium text-foreground'>1. Prepare</p>
                        <p className='mt-2 leading-6'>Choose a persona and set the practice context.</p>
                    </div>
                    <div className='rounded-2xl border border-white/70 bg-white/75 px-5 py-4 backdrop-blur-sm'>
                        <p className='font-medium text-foreground'>2. Practice</p>
                        <p className='mt-2 leading-6'>Start the conversation and complete the session.</p>
                    </div>
                    <div className='rounded-2xl border border-white/70 bg-white/75 px-5 py-4 backdrop-blur-sm'>
                        <p className='font-medium text-foreground'>3. Improve</p>
                        <p className='mt-2 leading-6'>Review the summary, grading, and transcript.</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function FeatureAssistants({ showIntro = true }) {
    const router = useRouter();

    const handleServiceClick = (service) => {
        if (service.name === 'Start Conversation') {
            router.push('/conversation');
        } else if (service.name === 'Persona Setting') {
            router.push('/persona');
        } else if (service.name === 'Rubric Setting') {
            router.push('/rubric');
        }
    };

    return (
        <div className='flex flex-col'>
            {showIntro ? <div className='mb-8'><DashboardIntro /></div> : null}
            <div className='grid max-w-full grid-cols-1 gap-5 md:grid-cols-3'>
                {ServiceLists.map((service, index) => (
                    <BlurFade key={service.icon} delay={0.25 + index * 0.05} inView>
                        <div
                            key={index}
                            className='w-full min-w-0'
                        >
                            <div
                                className='min-h-36 w-full max-w-full overflow-hidden rounded-3xl border bg-white p-5 flex flex-col justify-center items-center cursor-pointer shadow-md hover:shadow-lg hover:translate-y-[-3px] transition'
                                onClick={() => handleServiceClick(service)}
                            >
                                <div className='flex flex-col justify-center items-center'>
                                    <Image src={service.icon} alt={service.name} width={100} height={100} className='h-[70px] w-[auto]' />
                                    <h2 className='font-semibold mt-3'>{service.name}</h2>
                                </div>
                            </div>
                        </div>
                    </BlurFade>
                ))}
            </div>
        </div>
    )
}

export default FeatureAssistants
export { DashboardIntro }
