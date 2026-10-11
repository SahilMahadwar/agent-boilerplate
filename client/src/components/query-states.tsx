import type { UseQueryResult } from "@tanstack/react-query";
import { type ErrorComponentProps, Link, useRouter } from "@tanstack/react-router";
import { AlertCircle, RotateCw, SearchX } from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

// Shared loading / error / empty states. Every query renders one of these
// instead of a bare skeleton, so a failed request never looks like loading.

export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

export function ErrorState({
  error,
  title = "Something went wrong",
  onRetry,
}: {
  error: unknown;
  title?: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
            <RotateCw /> Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        {icon && <EmptyMedia variant="icon">{icon}</EmptyMedia>}
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
}

/**
 * What a component-level query shows before it has data:
 *   if (!query.isSuccess) return <QueryFallback query={query} />;
 * (the `isSuccess` check also narrows `query.data` below it).
 */
export function QueryFallback({
  query,
  className = "h-48 w-full",
}: {
  query: UseQueryResult<unknown>;
  className?: string;
}) {
  if (query.isError) return <ErrorState error={query.error} onRetry={() => query.refetch()} />;
  return <Skeleton className={className} />;
}

/** Route pending component: a page header and a content block. */
export function PageSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/** Route error component: loader or suspense query failures land here. */
export function RouteError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  return (
    <ErrorState
      error={error}
      title="Couldn't load this page"
      onRetry={() => {
        reset();
        router.invalidate();
      }}
    />
  );
}

export function NotFound() {
  return (
    <EmptyState
      icon={<SearchX />}
      title="Not found"
      description="This page doesn't exist."
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/">Back to overview</Link>
        </Button>
      }
    />
  );
}
