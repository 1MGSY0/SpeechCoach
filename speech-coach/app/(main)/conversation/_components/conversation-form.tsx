"use client";

import React, { useContext, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserContext } from "@/app/_context/UserContext";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CommandSelect } from "@/components/command-select";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { NewPersonaDialog } from "@/app/(main)/persona/_components/new-persona-dialog";
import type { ConversationGetOne } from "../types";

const conversationSchema = z.object({
  name: z.string().min(1, "Name is required."),
  personaId: z.string().min(1, "Persona is required."),
});

type ConversationFormValues = z.infer<typeof conversationSchema>;

interface ConversationFormProps {
  onSuccess?: (id?: string) => void;
  onCancel?: () => void;
  initialValues?: ConversationGetOne;
}

export const ConversationForm = ({
  onSuccess,
  onCancel,
  initialValues,
}: ConversationFormProps) => {
  const { userData } = useContext(UserContext) ?? {};
  const createConversation = useMutation(api.Conversations.CreateConversation);
  const updateConversation = useMutation(api.Conversations.UpdateConversation);
  const [openNewPersonaDialog, setOpenNewPersonaDialog] = useState(false);
  const isEdit = Boolean(initialValues?._id);

  const form = useForm<ConversationFormValues>({
    resolver: zodResolver(conversationSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      personaId: initialValues?.personaId ?? "",
    },
  });


  const hasUser = Boolean(userData?._id);
  const personasResponse = useQuery(
    api.Persona.ListPersonas,
    hasUser ? { userId: userData._id } : "skip"
  );
  const personas = personasResponse?.items ?? [];
  const selectedPersonaId = form.watch("personaId");
  const personaOptions = useMemo(
    () =>
      personas.map((persona) => ({
        id: persona._id,
        value: persona._id,
        children: (
          <div className="flex items-center gap-2">
            <GeneratedAvatar
              seed={persona.name}
              variant="botttsNeutral"
              className="border size 6"
            />
            <span>{persona.name}</span>
          </div>
        ),
      })),
    [personas]
  );

  const onSubmit = async (values: ConversationFormValues) => {
    if (!userData?._id) {
      toast.error("User record not ready yet. Try again.");
      return;
    }

    try {
      if (isEdit && initialValues?._id) {
        await updateConversation({
          userId: userData._id,
          conversationId: initialValues._id,
          personaId: values.personaId as Id<"Persona">,
          name: values.name,
        });
        onSuccess?.(initialValues._id);
      } else {
        const conversationId = await createConversation({
          userId: userData._id,
          personaId: values.personaId as Id<"Persona">,
          name: values.name,
        });

        onSuccess?.(conversationId);
        form.reset();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <>
      <NewPersonaDialog
        open={openNewPersonaDialog}
        onOpenChange={setOpenNewPersonaDialog}
      />
      <form className="space-y-4 p-4" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="conversation-name">
          Name
        </label>
        <Input
          className={undefined} id="conversation-name"
          type="text"
          placeholder="e.g. Week 1 coaching"
          {...form.register("name")}/>
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="conversation-persona">
          Persona
        </label>
        <CommandSelect
          options={personaOptions}
          value={selectedPersonaId}
          onSelect={(value) =>
            form.setValue("personaId", value, { shouldValidate: true })
          }
          placeholder={hasUser ? "Select a persona" : "Loading user..."}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground">
          Not found what you&apos;re looking for?{" "}
          <button  
            type="button"
            className="text-primary hover:underline"
            onClick={() => setOpenNewPersonaDialog(true)}
          >
            Create new persona
          </button>
        </p>
        {form.formState.errors.personaId && (
          <p className="text-xs text-destructive">
            {form.formState.errors.personaId.message}
          </p>
        )}
      </div>

      <div className="flex justify-between gap-x-2">
        {onCancel && (
          <Button
                      variant="ghost"
                      type="button"
                      disabled={form.formState.isSubmitting}
                      onClick={() => onCancel()} className={undefined}          >
            Cancel
          </Button>
        )}
        <Button disabled={form.formState.isSubmitting} type="submit" className={undefined}>
          {isEdit ? "Save" : "Create"}
        </Button>
      </div>
      </form>
    </>
  );
};
