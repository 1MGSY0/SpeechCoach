"use client";

import React, { useContext } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { UserContext } from "@/app/_context/UserContext";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GeneratedAvatar } from "@/components/generated-avatar";

const personaSchema = z.object({
  name: z.string().min(1, "Name is required."),
  instructions: z.string().min(1, "Instructions are required."),
});

type PersonaFormValues = z.infer<typeof personaSchema>;

type PersonaFormInitialValues = {
  _id?: Id<"Persona">;
  name?: string;
  instructions?: string;
};

interface PersonaFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialValues?: PersonaFormInitialValues;
}

export const PersonaForm = ({
  onSuccess,
  onCancel,
  initialValues,
}: PersonaFormProps) => {
  const { userData } = useContext(UserContext) ?? {};
  const createPersona = useMutation(api.Persona.CreatePersona);
  const updatePersona = useMutation(api.Persona.UpdatePersona);

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      instructions: initialValues?.instructions ?? "",
    },
  });

  const isEdit = Boolean(initialValues?._id);

  const onSubmit = async (values: PersonaFormValues) => {
    if (!userData?._id) {
      toast.error("User record not ready yet. Try again.");
      return;
    }

    try {
      if (isEdit && initialValues?._id) {
        await updatePersona({
          userId: userData._id,
          personaId: initialValues._id,
          name: values.name,
          instructions: values.instructions,
        });
      } else {
        await createPersona({
          userId: userData._id,
          name: values.name,
          instructions: values.instructions,
        });
      }

      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <form className="space-y-4 p-4" onSubmit={form.handleSubmit(onSubmit)}>
        <GeneratedAvatar
          seed={form.watch("name")}
          variant="botttsNeutral"
          className="border size-16"
        />
      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-name">
          Name
        </label>
        <Input
          id="persona-name"
          type="text"
          className=""
          placeholder="e.g. Math tutor"
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-instructions">
          Instructions
        </label>
        <Textarea
          id="persona-instructions"
          className=""
          placeholder="You are a helpful math assistant that can answer questions and help with assignments."
          {...form.register("instructions")}
        />
        {form.formState.errors.instructions && (
          <p className="text-xs text-destructive">
            {form.formState.errors.instructions.message}
          </p>
        )}
      </div>

      <div className="flex justify-between gap-x-2">
        {onCancel && (
          <Button
            className=""
            variant="ghost"
            type="button"
            disabled={form.formState.isSubmitting}
            onClick={() => onCancel()}
          >
            Cancel
          </Button>
        )}
        <Button className="" disabled={form.formState.isSubmitting} type="submit">
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
};
