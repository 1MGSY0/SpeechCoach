import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";

export type PersonasGetMany = FunctionReturnType<typeof api.Persona.ListPersonas>;
export type PersonaGetOne = FunctionReturnType<typeof api.Persona.GetPersonaDetails>;
