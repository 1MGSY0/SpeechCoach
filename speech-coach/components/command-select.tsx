import { ReactNode, useEffect, useState } from "react";
import { ChevronsUpDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface Props {
  options: Array<{
    id: string;
    value: string;
    children: ReactNode;
  }>;
  onSelect: (value: string) => void;
  onSearch?: (value: string) => void;
  value: string;
  placeholder?: string;
  isSearchable?: boolean;
  className?: string;
};

export const CommandSelect = ({
  options,
  onSelect,
  onSearch,
  value,
  placeholder = "Select an option",
  className,
}: Props) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  const handleOpenChange = (open: boolean) => {
    onSearch?.("");
    setOpen(open);
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleOpenChange(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="relative">
      <Button
        onClick={() => setOpen(true)}
        type="button"
        variant="outline"
        className={cn(
          "h-9 w-full justify-between font-normal px-2",
          !selectedOption && "text-muted-foreground",
          className,
        )}
      >
        <div>
          {selectedOption?.children ?? placeholder}
        </div>
        <ChevronsUpDownIcon />
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70"
            onClick={() => handleOpenChange(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(480px,calc(100%-2rem))]">
            <Command
              shouldFilter={!onSearch}
              className="overflow-hidden rounded-md border border-border bg-popover shadow-lg"
            >
              <div className="relative">
                <CommandInput placeholder="Search..." onValueChange={onSearch} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleOpenChange(false)}
                  className="absolute right-1 top-1/2 -translate-y-1/2"
                >
                  <XIcon />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
              <CommandList>
                <CommandEmpty>
                  <span className="text-muted-foreground text-sm">
                    No options found
                  </span>
                </CommandEmpty>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    onSelect={() => {
                      onSelect(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.children}
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </div>
        </>
      )}
    </div>
  );
};