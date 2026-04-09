"use client";

import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@stackframe/stack";
import {
  ClipboardList,
  Home,
  Menu,
  MessagesSquare,
  MessageSquarePlus,
  UserRound,
  X,
} from "lucide-react";

import { UserContext } from "@/app/_context/UserContext";
import { NewConversationDialog } from "@/app/(main)/conversation/_components/new-convo-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { generateAvatarUri } from "@/lib/avartar";

const MENU_ITEMS = [
  {
    label: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    label: "Conversation List",
    href: "/conversation",
    icon: MessagesSquare,
  },
  {
    label: "Persona Setting",
    href: "/persona",
    icon: UserRound,
  },
  {
    label: "Rubric Setting",
    href: "/rubric",
    icon: ClipboardList,
  },
];

function AppHeader() {
  const headerRef = useRef(null);
  const pathname = usePathname();
  const { userData } = useContext(UserContext) ?? {};

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showFloatingMenuButton, setShowFloatingMenuButton] = useState(false);

  const displayName = userData?.name?.trim() || "User";
  const avatarSrc = useMemo(() => {
    if (userData?.image) {
      return userData.image;
    }

    return generateAvatarUri({
      seed: displayName,
      variant: "initials",
    });
  }, [displayName, userData?.image]);

  useEffect(() => {
    const updateFloatingMenuButton = () => {
      const headerBottom = headerRef.current?.getBoundingClientRect()?.bottom ?? 0;
      setShowFloatingMenuButton(headerBottom <= 0);
    };

    updateFloatingMenuButton();
    window.addEventListener("scroll", updateFloatingMenuButton, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateFloatingMenuButton);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMenuOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <>
      <NewConversationDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

      <div
        ref={headerRef}
        className="border-b border-border/70 bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            aria-label="Open navigation menu"
            onClick={() => setIsMenuOpen(true)}
            className="flex items-center gap-3 px-3 py-2 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Logo"
                width={50}
                height={50}
                priority
                className="w-auto"
              />
              <h2 className="text-xl font-bold text-primary">Speech Coach</h2>
            </div>
          </button>

          <UserButton />
        </div>
      </div>

      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((current) => !current)}
        className={[
          "fixed top-4 left-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/95 text-foreground shadow-lg backdrop-blur transition-all duration-300",
          showFloatingMenuButton && !isMenuOpen
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-3 scale-95 opacity-0",
        ].join(" ")}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={[
          "fixed inset-0 z-40 bg-black/35 transition-opacity duration-300",
          isMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={[
          "fixed top-0 left-0 z-40 flex h-full w-[min(20rem,calc(100vw-2rem))] flex-col border-r border-border/70 bg-background/95 shadow-2xl backdrop-blur transition-transform duration-300 ease-out",
          isMenuOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center gap-3 border-b border-border/70 px-6 py-6">
          <Image src="/logo.svg" alt="Speech Coach logo" width={36} height={36} className="w-auto" />
          <div>
            <p className="text-sm text-muted-foreground">Navigation</p>
            <h3 className="text-lg font-semibold text-primary">Speech Coach</h3>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          <div className="space-y-2">
            {MENU_ITEMS.slice(0, 1).map(({ label, href, icon: Icon }) => {
              const isActive =
                href === "/dashboard" ? pathname === href : pathname?.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted/10",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setIsMenuOpen(false);
                setIsDialogOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-foreground transition-colors duration-200 hover:bg-muted/10"
            >
              <MessageSquarePlus className="h-4 w-4" />
              <span>Create Conversation</span>
            </button>

            {MENU_ITEMS.slice(1).map(({ label, href, icon: Icon }) => {
              const isActive =
                href === "/dashboard" ? pathname === href : pathname?.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-muted/10",
                  ].join(" ")}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-border/70 px-4 py-5">
          <div className="flex items-center gap-3 rounded-2xl bg-muted/10 px-4 py-3">
            <UserButton />
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Signed In</p>
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            </div>
            
          </div>
        </div>
      </aside>
    </>
  );
}

export default AppHeader;
