"use client";

import React from "react";
import { usePreloadedQuery } from "convex/react";

export default function PersonaView ({ preloadedPersonas }) {
  const personas = usePreloadedQuery(preloadedPersonas);

  if (personas.length === 0) {
    return <div>No personas found. Click add persona to create one.</div>;
  }

  return <div>{JSON.stringify(personas, null, 2)}</div>;
}
