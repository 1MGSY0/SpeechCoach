"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

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
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onRowClick,
  variant = "table",
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (variant === "cards") {
    return (
      <div className="flex flex-col gap-3">
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <div
              onClick={() => onRowClick?.(row.original)}
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
              className="cursor-pointer"
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
