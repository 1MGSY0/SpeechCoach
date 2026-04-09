"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useReEvaluateConversation(conversationId: string) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReEvaluate = async () => {
    try {
      setIsSubmitting(true);

      const response = await fetch("/api/conversation/re-evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ conversationId }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to re-evaluate.");
      }

      toast.success("Re-evaluation started. Any previous processing run is being cancelled.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to re-evaluate."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleReEvaluate,
  };
}
