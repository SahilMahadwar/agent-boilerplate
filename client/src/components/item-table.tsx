import { ChevronRight, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { ItemLink } from "@/components/item-link";
import { EmptyState } from "@/components/query-states";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SectionKey } from "@/configs/navigation";

export type Column<T> = { header: string; cell: (row: T) => ReactNode; className?: string };

/** List page table whose first column links to the item page. */
export function ItemTable<T extends { id: string; name: string }>({
  section,
  rows,
  columns,
  empty,
}: {
  section: SectionKey;
  rows: T[];
  columns: Column<T>[];
  empty: ReactNode;
}) {
  if (rows.length === 0) return <EmptyState icon={<Inbox />} title="Nothing here yet" description={empty} />;

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            {columns.map((column) => (
              <TableHead key={column.header} className={column.className}>
                {column.header}
              </TableHead>
            ))}
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <ItemLink section={section} id={row.id} className="font-medium hover:underline">
                  {row.name}
                </ItemLink>
                <p className="text-muted-foreground font-mono text-xs">{row.id}</p>
              </TableCell>
              {columns.map((column) => (
                <TableCell key={column.header} className={column.className}>
                  {column.cell(row)}
                </TableCell>
              ))}
              <TableCell>
                <ItemLink section={section} id={row.id} aria-label={`Open ${row.name}`}>
                  <ChevronRight className="text-muted-foreground size-4" />
                </ItemLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
