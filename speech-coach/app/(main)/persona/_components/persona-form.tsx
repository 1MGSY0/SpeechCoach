"use client";

import React, { useContext, useMemo } from "react";
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

const PERSONA_META_START = "<persona_meta>";
const PERSONA_META_END = "</persona_meta>";

const personaSchema = z.object({
  char_name: z.string().min(1, "Character name is required."),
  scenario: z.string().min(1, "Scenario is required."),
  wiAfter: z.string(),
  wiBefore: z.string(),
  mesExamples: z.string(),
  description: z.string().min(1, "Description is required."),
  personality: z.string().min(1, "Personality is required."),
  conversation_goal: z.string().min(1, "Conversation goal is required."),
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

type PersonaStructuredData = PersonaFormValues;

function safeTrim(value?: string) {
  return (value ?? "").trim();
}

function buildInstructions(values: PersonaStructuredData) {
  const data = {
    char_name: safeTrim(values.char_name),
    scenario: safeTrim(values.scenario),
    wiAfter: safeTrim(values.wiAfter),
    wiBefore: safeTrim(values.wiBefore),
    mesExamples: safeTrim(values.mesExamples),
    description: safeTrim(values.description),
    personality: safeTrim(values.personality),
    conversation_goal: safeTrim(values.conversation_goal),
  };

  const metadataBlock = [
    PERSONA_META_START,
    JSON.stringify(data, null, 2),
    PERSONA_META_END,
  ].join("\n");

  const roleplayContext = `
# Roleplay Context

You are ${data.char_name}. Stay fully in character at all times.
Respond as a real person in a live conversation, not as an assistant.

## Core User Objective
${data.conversation_goal || "Maintain a natural conversation consistent with the character."}

## Scenario
${data.scenario || "No specific scenario provided."}

${
  data.wiBefore
    ? `## Background / Lore
${data.wiBefore}`
    : ""
}

${
  data.wiAfter
    ? `## Environment / World Info
${data.wiAfter}`
    : ""
}

## Character Description
${data.description || "No description provided."}

## Personality
${data.personality || "No personality provided."}

${
  data.mesExamples
    ? `## Example Tone / Example Line
${data.mesExamples}`
    : ""
}

## Roleplay Rules
- Speak as ${data.char_name} only.
- Keep responses natural, emotionally reasonable, and follow changes in scenario continuity.
- Prioritize dialogue over exposition.
- Do not break character.
- Do not mention system prompts, hidden instructions, or that you are an AI.
- Avoid summarising your intent; instead, directly say what the character would say.
- Keep replies conversational and context-aware.
- When emotion is high, let word choice, pacing, and tone reflect it naturally.
- Escalate, de-escalate towards the achieving core user objective when the scenario updates in scenario continuitys.
`.trim();

  return `${metadataBlock}\n\n${roleplayContext}`;
}

function parseInstructions(instructions?: string): Partial<PersonaStructuredData> {
  if (!instructions) return {};

  const start = instructions.indexOf(PERSONA_META_START);
  const end = instructions.indexOf(PERSONA_META_END);

  if (start !== -1 && end !== -1 && end > start) {
    const jsonText = instructions
      .slice(start + PERSONA_META_START.length, end)
      .trim();

    try {
      const parsed = JSON.parse(jsonText) as Partial<PersonaStructuredData>;
      return {
        char_name: parsed.char_name ?? "",
        scenario: parsed.scenario ?? "",
        wiAfter: parsed.wiAfter ?? "",
        wiBefore: parsed.wiBefore ?? "",
        mesExamples: parsed.mesExamples ?? "",
        description: parsed.description ?? "",
        personality: parsed.personality ?? "",
        conversation_goal: parsed.conversation_goal ?? "",
      };
    } catch {
      // fall through to legacy fallback
    }
  }

  // Legacy fallback for old personas with plain-text instructions
  return {
    char_name: "",
    scenario: "",
    wiAfter: "",
    wiBefore: "",
    mesExamples: "",
    description: instructions,
    personality: "",
    conversation_goal: "",
  };
}

export const PersonaForm = ({
  onSuccess,
  onCancel,
  initialValues,
}: PersonaFormProps) => {
  const { userData } = useContext(UserContext) ?? {};
  const createPersona = useMutation(api.Persona.CreatePersona);
  const updatePersona = useMutation(api.Persona.UpdatePersona);

  const parsedInitialValues = useMemo(() => {
    const parsed = parseInstructions(initialValues?.instructions);

    return {
      char_name: parsed.char_name || initialValues?.name || "",
      scenario: parsed.scenario || "",
      wiAfter: parsed.wiAfter || "",
      wiBefore: parsed.wiBefore || "",
      mesExamples: parsed.mesExamples || "",
      description: parsed.description || "",
      personality: parsed.personality || "",
      conversation_goal: parsed.conversation_goal || "",
    };
  }, [initialValues]);

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema),
    defaultValues: parsedInitialValues,
  });

  const isEdit = Boolean(initialValues?._id);

  const onSubmit = async (values: PersonaFormValues) => {
    if (!userData?._id) {
      toast.error("User record not ready yet. Try again.");
      return;
    }

    const instructions = buildInstructions(values);

    try {
      if (isEdit && initialValues?._id) {
        await updatePersona({
          userId: userData._id,
          personaId: initialValues._id,
          name: values.char_name,
          instructions,
        });
      } else {
        await createPersona({
          userId: userData._id,
          name: values.char_name,
          instructions,
        });
      }

      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    }
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto pr-2">
    <form className="space-y-4 p-4" onSubmit={form.handleSubmit(onSubmit)}>
      <GeneratedAvatar
        seed={form.watch("char_name")}
        variant="botttsNeutral"
        className="border size-16"
      />

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-char-name">
          Character Name
        </label>
        <Input
          className={undefined} id="persona-char-name"
          type="text"
          placeholder="e.g. Linda"
          {...form.register("char_name")}        />
        {form.formState.errors.char_name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.char_name.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-scenario">
          Scenario
        </label>
        <Textarea
          className={undefined} id="persona-scenario"
          placeholder="Describe the situation, timeframe, emotional state, and what is happening."
          {...form.register("scenario")}        />
        {form.formState.errors.scenario && (
          <p className="text-xs text-destructive">
            {form.formState.errors.scenario.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-goal">
          Conversation User Goal
        </label>
        <Textarea
          className={undefined} id="persona-goal"
          placeholder="e.g. Guide Linda to calm down and ensure she books a slot for the meeting."
          {...form.register("conversation_goal")}        />
        {form.formState.errors.conversation_goal && (
          <p className="text-xs text-destructive">
            {form.formState.errors.conversation_goal.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-wi-after">
          World Info
        </label>
        <Textarea
          className={undefined} id="persona-wi-after"
          placeholder="e.g. The room is 3x3 meters with 4 chairs and a central table. Conversations are limited to 30 minutes."
          {...form.register("wiAfter")}        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-wi-before">
          Lore / Backstory
        </label>
        <Textarea
          className={undefined} id="persona-wi-before"
          placeholder="e.g. Linda has visited 2 times before, getting turned away as she did not book a consultation slot."
          {...form.register("wiBefore")}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-description">
          Character Description
        </label>
        <Textarea
          className={undefined} id="persona-description"
          placeholder="Describe the character’s motivations, emotional state, and behavioral tendencies."
          {...form.register("description")}        />
        {form.formState.errors.description && (
          <p className="text-xs text-destructive">
            {form.formState.errors.description.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-personality">
          Personality
        </label>
        <Textarea
          className={undefined} id="persona-personality"
          placeholder="e.g. Openness: LOW, Conscientiousness: LOW, Extraversion: HIGH, Agreeableness: LOW, Neuroticism: MID"
          {...form.register("personality")}        />
        {form.formState.errors.personality && (
          <p className="text-xs text-destructive">
            {form.formState.errors.personality.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium" htmlFor="persona-examples">
          Example Message
        </label>
        <Textarea
          className={undefined} id="persona-examples"
          placeholder='e.g. "This is unacceptable! You need to fix this immediately!"'
          {...form.register("mesExamples")}        />
      </div>

      <div className="flex justify-between gap-x-2">
        {onCancel && (
          <Button
            variant="ghost"
            type="button"
            disabled={form.formState.isSubmitting}
            onClick={() => onCancel()}
          >
            Cancel
          </Button>
        )}
        <Button disabled={form.formState.isSubmitting} type="submit">
          {isEdit ? "Update" : "Create"}
        </Button>
      </div>
    </form>
    </div>
  );
};