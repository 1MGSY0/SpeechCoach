"use client";

import React from "react";
import { usePreloadedQuery } from "convex/react";
import { Button } from "@base-ui/react";

export default function PersonaView ({ preloadedPersonas }) {
  const personas = usePreloadedQuery(preloadedPersonas);

  if (personas.length === 0) {
    return <div>No personas found. Click add persona to create one.</div>;
  }

  return (
    <div>
        <Button variant="outline" size="sm">Add Persona</Button>
      {JSON.stringify(personas, null, 2)}
    </div>
    );
}
