import type * as React from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface AdminTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

interface AdminDataTableProps<T> {
  rows: T[];
  columns: Array<AdminTableColumn<T>>;
  getRowKey: (row: T) => string;
  empty?: React.ReactNode;
  caption?: string;
  className?: string;
}

/**
 * Generic admin table shell. Filtering and local preview actions live in the
 * owning client component; this component only handles consistent presentation.
 */
export function AdminDataTable<T>({
  rows,
  columns,
  getRowKey,
  empty,
  caption,
  className,
}: AdminDataTableProps<T>) {
  if (rows.length === 0) {
    return <>{empty}</>;
  }

  return (
    <Table className={cn(className)}>
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={column.headerClassName}>
              {column.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={getRowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.id} className={column.className}>
                {column.cell(row)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
