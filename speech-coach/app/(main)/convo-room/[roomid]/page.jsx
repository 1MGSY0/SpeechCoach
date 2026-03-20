"use client"
import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { PersonaOptions } from '@/services/Options';
import Image from 'next/image';
import { UserButton } from '@stackframe/stack';
import { Button } from '@/components/ui/button';

function ConvoRoom() {

    const {roomid} = useParams();
    const ConvoRoomData = useQuery(api.ConvoRoom.GetRoomDetails, {roomId: roomid});
    
    const[foundPersona, setPersona] = useState(null);

    useEffect(() => {
        if(ConvoRoomData) {
            const foundPersona = PersonaOptions.find(option => option.name === ConvoRoomData.persona); 
            console.log(foundPersona);
            setPersona(foundPersona);
        }
    }, [ConvoRoomData]);

    if (ConvoRoomData === undefined) {
        return <p>Loading...</p>;
    }

    if (!ConvoRoomData) {
        return <p>Room not found</p>;
    }

    return (
    <div>
        {ConvoRoomData ? (
            <div>
                <div className='mt-5 grid grid-cols-1 lg:grid-cols-3 gap-10'>
                    <div className='lg:col-span-2 '>
                        <div className='h-[50vh] bg-secondary border rounded-4xl 
                        flex flex-col items-center justify-center relative '>
                            {foundPersona?.avatar ? (
                                <Image
                                    src={foundPersona.avatar}
                                    alt={foundPersona.name || "Persona avatar"}
                                    width={100}
                                    height={100}
                                    className="h-[80px] w-[80px] rounded-full object-cover animate-pulse"
                                />
                                ) : (
                                <div className="h-[80px] w-[80px] rounded-full bg-gray-300" />
                            )}
                            <h2 className='text-lg font-bold'>{ConvoRoomData?.persona}</h2>

                            <div className="p-5 bg-gray-200 px-10 rounded-lg absolute bottom-10 right-10 pointer-events-none">
                                <UserButton />
                            </div>
                        </div>
                        <div className='mt-5 flex items-center justify-center'>
                            <Button className='rounded-md'> Connect</Button>
                        </div>
                    </div>
                    <div>
                        <div className='h-[50vh] bg-secondary border rounded-4xl 
                        flex flex-col items-center justify-center relative '>
                            <h2 >Chat</h2>   
                        </div>
                        <h2 className='text-gray-400 p-5'>Your conversation will be scripted and graded once upon completion.</h2>
                    </div>
                </div>
            </div>
        ) : (
            <p>Room not found</p>
        )}
    </div>
    )
}

export default ConvoRoom
