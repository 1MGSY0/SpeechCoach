import * as React from "react";

import { cn } from "@/lib/utils";

function Badge({
  className,
  ...props
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none border border-border px-2 py-0.5 text-xs font-medium text-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Badge };
