"use client";

import React from "react";
import { usePreloadedQuery } from "convex/react";
import { Button } from "@base-ui/react";
import { DataTable } from "./data-table";
import { columns} from "./columns";



export default function PersonaView ({ preloadedPersonas }) {
  const personas = usePreloadedQuery(preloadedPersonas);

  if (personas.length === 0) {
    return <div>No personas found. Click add persona to create one.</div>;
  }

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
        <DataTable data={personas} columns={columns}/>
    </div>
    );
}
