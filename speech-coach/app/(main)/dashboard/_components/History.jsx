"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { columns } from "@/app/(main)/conversation/_components/columns";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function History({ processingItems = [], completedItems = [] }) {
  const router = useRouter();
  const railRef = useRef(null);
  const autoScrollRef = useRef(null);
  const dragStateRef = useRef({
    isDragging: false,
    pointerId: null,
    startX: 0,
    startScrollLeft: 0,
  });
  const [isPaused, setIsPaused] = useState(false);
  const items = [...processingItems, ...completedItems]
    .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
    .slice(0, 5);
  const railItems = items.length > 1 ? [...items, ...items] : items;

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || items.length <= 1) return;

    autoScrollRef.current = window.setInterval(() => {
      if (isPaused) return;

      const halfwayPoint = rail.scrollWidth / 2;
      if (halfwayPoint <= rail.clientWidth) return;

      const nextLeft = rail.scrollLeft + 1;
      rail.scrollLeft = nextLeft >= halfwayPoint ? nextLeft - halfwayPoint : nextLeft;
    }, 24);

    return () => {
      if (autoScrollRef.current) {
        window.clearInterval(autoScrollRef.current);
      }
    };
  }, [isPaused, items.length]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const handleNativeWheel = (event) => {
      const hasHorizontalOverflow = rail.scrollWidth > rail.clientWidth;
      if (!hasHorizontalOverflow) return;

      const horizontalDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

      if (horizontalDelta === 0) return;

      event.preventDefault();
      event.stopPropagation();
      rail.scrollLeft += horizontalDelta;

      const halfwayPoint = rail.scrollWidth / 2;
      if (items.length > 1 && halfwayPoint > rail.clientWidth) {
        if (rail.scrollLeft >= halfwayPoint) {
          rail.scrollLeft -= halfwayPoint;
        } else if (rail.scrollLeft < 0) {
          rail.scrollLeft += halfwayPoint;
        }
      }
    };

    rail.addEventListener("wheel", handleNativeWheel, { passive: false });

    return () => {
      rail.removeEventListener("wheel", handleNativeWheel);
    };
  }, [items.length]);

  const scrollRail = (direction) => {
    const rail = railRef.current;
    if (!rail) return;

    const amount = Math.max(280, Math.floor(rail.clientWidth * 0.75));
    rail.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  const handlePointerDown = (event) => {
    const rail = railRef.current;
    if (!rail) return;

    dragStateRef.current = {
      isDragging: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startScrollLeft: rail.scrollLeft,
    };
  };

  const handlePointerMove = (event) => {
    const rail = railRef.current;
    const dragState = dragStateRef.current;
    if (!rail || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const hasExceededThreshold = Math.abs(deltaX) > 6;

    if (!dragState.isDragging && hasExceededThreshold) {
      dragState.isDragging = true;
      setIsPaused(true);
      rail.setPointerCapture(event.pointerId);
    }

    if (!dragState.isDragging) return;

    rail.scrollLeft = dragState.startScrollLeft - deltaX;
  };

  const endPointerDrag = (event) => {
    const rail = railRef.current;
    const dragState = dragStateRef.current;
    if (!rail || dragState.pointerId !== event.pointerId) return;

    if (dragState.isDragging && dragState.pointerId !== null) {
      rail.releasePointerCapture(dragState.pointerId);
    }

    dragStateRef.current = {
      isDragging: false,
      pointerId: null,
      startX: 0,
      startScrollLeft: 0,
    };

    if (!rail.matches(":hover")) {
      setIsPaused(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col space-y-4 overflow-hidden p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-gray-500">Recent Practices</h2>
      </div>

      <div className="min-w-0 pr-1">
        {items.length === 0 ? (
          <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
            No processing or completed conversations yet.
          </div>
        ) : (
          <div
            className="relative min-w-0 overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <DataTable
              onRowClick={(row) => router.push(`/conversation/${row._id}`)}
              data={railItems}
              columns={columns}
              variant="cards"
              cardsContainerRef={railRef}
              cardsContainerClassName="no-scrollbar grid-flow-col auto-cols-[320px] gap-4 overflow-x-auto px-12 pb-3"
              cardsItemClassName="min-w-[320px] max-w-[360px] shrink-0"
              cardsContainerProps={{
                onPointerDown: handlePointerDown,
                onPointerMove: handlePointerMove,
                onPointerUp: endPointerDrag,
                onPointerCancel: endPointerDrag,
                onPointerLeave: endPointerDrag,
                className:
                  "cursor-grab select-none touch-pan-x active:cursor-grabbing",
              }}
            />
            <button
              type="button"
              aria-label="Scroll recent practices left"
              onClick={() => scrollRail("left")}
              className="absolute inset-y-0 left-0 z-10 flex w-12 items-center justify-start bg-gradient-to-r from-slate-100 via-slate-100/80 to-transparent pl-1 text-slate-500 transition hover:text-primary"
            >
              <span
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "pointer-events-none rounded-full bg-white/90 shadow-sm"
                )}
              >
                <ChevronLeftIcon className="size-4" />
              </span>
            </button>
            <button
              type="button"
              aria-label="Scroll recent practices right"
              onClick={() => scrollRail("right")}
              className="absolute inset-y-0 right-0 z-10 flex w-12 items-center justify-end bg-gradient-to-l from-slate-100 via-slate-100/80 to-transparent pr-1 text-slate-500 transition hover:text-primary"
            >
              <span
                className={cn(
                  buttonVariants({ variant: "outline", size: "icon" }),
                  "pointer-events-none rounded-full bg-white/90 shadow-sm"
                )}
              >
                <ChevronRightIcon className="size-4" />
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Link
          href="/conversation"
          className="text-sm font-medium text-primary transition hover:underline"
        >
          ... show full records
        </Link>
      </div>
    </div>
  );
}

export default History;