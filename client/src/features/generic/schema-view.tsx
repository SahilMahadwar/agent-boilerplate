import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type JsonSchema, parseSchema } from "@/lib/mastra-queries";

/** Field table for an object JSON Schema (as Mastra serializes zod schemas). */
export function SchemaView({ schema }: { schema: unknown }) {
  const parsed = parseSchema(schema);
  const properties = Object.entries(parsed?.properties ?? {}) as [string, JsonSchema][];

  if (properties.length === 0) {
    return <p className="text-muted-foreground text-sm">No fields.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Field</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {properties.map(([name, field]) => (
          <TableRow key={name}>
            <TableCell className="font-mono text-xs">
              {name}
              {parsed?.required?.includes(name) && (
                <span className="text-destructive">*</span>
              )}
            </TableCell>
            <TableCell>
              <Badge variant="outline">{field.type ?? "any"}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm whitespace-normal">
              {field.description ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
