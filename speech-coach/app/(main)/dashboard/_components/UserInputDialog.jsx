import React, { useContext, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import Image from 'next/image'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { PersonaOptions } from '@/services/Options'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { UserContext } from '@/app/_context/UserContext'

function UserInputDialog({children, serviceOption}) {

    const [selectedPersona, setSelectedPersona] = useState(null);
    const [scenario, setScenario] = useState(null);
    const createConvoRoom = useMutation(api.ConvoRoom.CreateNewRoom);
    const [loading, setLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const router = useRouter();
    const { userData } = useContext(UserContext);

    const OnClickNext = async () => {

        setLoading(true);

        const result = await createConvoRoom({
            persona: selectedPersona?.name,
            scenario: scenario,
            conversation: null,
        })
        console.log(result);
        setLoading(false);
        setOpenDialog(false);
        router.push('/convo-room/' + result);
    }

    const onPersonaSelect = (persona) => {
        setSelectedPersona(persona)
    }

    return (
    <div>
        <Dialog open={openDialog} onOpenChange={(open) => setOpenDialog(open)}>
        <DialogTrigger>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{serviceOption.name}</DialogTitle>
                    <DialogDescription>
                        Select a persona to get started
                    </DialogDescription>
                </DialogHeader>
                    <div> 
                        <Textarea className='w-full h-20 mt-2' placeholder='Type the scenario here...' 
                            value={scenario}
                            onChange={(e) => setScenario(e.target.value)}
                        />
                    </div>
                    <div className='grid grid-cols-3 gap-3 mt-3'>
                        {PersonaOptions.map((persona, index) => (
                            <div key={index} onClick={() => setSelectedPersona(persona)}>
                                <Image src={persona.avatar} alt={persona.name}
                                    width={100}
                                    height={100}
                                    className={`rounded-xl h-[100px] w-[auto] object-cover
                                    hover:scale-105 transition-all cursor-pointer p-1 border-primary
                                    ${selectedPersona?.name == persona.name && 'border'}`}/>
                                <h2 className='text-center'>{persona.name}</h2>
                            </div>
                        ))}
                    </div>
                    <div className='flex gap-5 justify-end mt-5'>
                        <DialogClose variant='ghost'>Cancel</DialogClose>
                        <Button disabled={(!scenario || !selectedPersona || loading)} onClick={OnClickNext}>
                            {loading && <LoaderCircle className='animate-spin' />}
                            Next
                        </Button>
                    </div>
                    
            </DialogContent>
        </Dialog>
        
    </div>
    )
}

export default UserInputDialog
