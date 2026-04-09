"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"

function Collapsible({
  ...props
}) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
  ...props
}) {
  return (<CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />);
}

function CollapsibleContent({
  forceMount,
  ...props
}) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      keepMounted={forceMount}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
