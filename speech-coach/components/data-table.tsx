"use client"

import type { HTMLAttributes, Ref } from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { cn } from "@/lib/utils"

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  onRowClick?: (row: TData) => void;
  variant?: "table" | "cards";
  cardsContainerClassName?: string;
  cardsContainerRef?: Ref<HTMLDivElement>;
  cardsItemClassName?: string;
  cardsContainerProps?: HTMLAttributes<HTMLDivElement>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  variant = "table",
  cardsContainerClassName,
  cardsContainerRef,
  cardsItemClassName,
  cardsContainerProps,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (variant === "cards") {
    return (
      <div
        ref={cardsContainerRef}
        {...cardsContainerProps}
        className={cn("grid gap-3", cardsContainerClassName, cardsContainerProps?.className)}
      >
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              onClick={() => onRowClick?.(row.original)}
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
              className={cn("cursor-pointer", cardsItemClassName)}
            >
              {row.getVisibleCells().map((cell) => (
                <div key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
              ))}
            </div>
          ))
        ) : (
          <div className="rounded-lg border bg-background p-6 text-center text-muted-foreground">
            No results.
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-background overflow-hidden">
      <Table className={undefined}>
        <TableBody className={undefined}>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                    onClick={() => onRowClick?.(row.original)}
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"} 
                    className='cursor-pointer hover:bg-muted/5'>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap p-4">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className={undefined}>
              <TableCell colSpan={columns.length} className="h-19 text-center text-muted-foreground">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
