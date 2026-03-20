"use client";
import { Button } from "@base-ui/react";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function Home() {

  const router = useRouter();

  const handleClick = () => {
    router.push('/dashboard');
  };


  return (
    <div>
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="mb-6 flex items-center px-4">
            <Image src="/logo.svg" alt="Logo" width={20} height={20} className="h-5 w-auto mr-2" />
            <h2 className="text-lg font-semibold text-primary">Speech Coach</h2>
        </div>
        <div 
        className='p-3 rounded-3xl flex flex-col justify-center items-center cursor-pointer hover:bg-secondary/80 hover:translate-y-[-3px] transition'
        onClick={() => handleClick()}>
            <h1 className="text-6xl font-bold text-center">Go to F*P!</h1>
        </div>
        
      </main>
    </div>
  );
}
