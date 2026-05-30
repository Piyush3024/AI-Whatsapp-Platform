"use client";

import Link from "next/link";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { BackgroundGlow } from "@/components/shared/background-glow";

interface ErrorDisplayProps {
  code: string;
  title: string;
  description: string;
  showGoBack?: boolean;
  showHome?: boolean;
  homeHref?: string;
  homeLabel?: string;
  onReset?: () => void;
  resetLabel?: string;
  className?: string;
  minimal?: boolean;
}

export function ErrorDisplay({
  code,
  title,
  description,
  showGoBack = true,
  showHome = true,
  homeHref = "/dashboard",
  homeLabel = "Back to Dashboard",
  onReset,
  resetLabel = "Try Again",
  className,
  minimal = false,
}: ErrorDisplayProps) {
  if (minimal) {
    return (
      <div className={cn("w-full", className)}>
        <div className="m-auto flex w-full flex-col items-center justify-center gap-2 py-8">
          <span className="font-medium">Oops! Something went wrong</span>
          <p className="text-center text-muted-foreground text-sm">
            {description}
          </p>
          {onReset && (
            <Button size="sm" onClick={onReset} className="mt-2 uppercase">
              {resetLabel}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative flex min-h-screen w-full items-center justify-center",
        className,
      )}
    >
      <BackgroundGlow className="left-1/2" />
      <div className="space-y-8 text-center">
        <h1 className="font-medium text-[7rem] text-foreground/90 leading-none tracking-[0.3em] md:text-[9rem]">
          {code}
        </h1>
        <p className="font-medium text-primary/80 text-sm uppercase tracking-[0.2em] md:text-base">
          {title}
        </p>
        <p className="max-w-md mx-auto font-medium text-primary/60 text-sm uppercase tracking-[0.2em] md:text-base">
          {description}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          {showGoBack && (
            <Button
              variant="outline"
              className="uppercase"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          )}
          {onReset && (
            <Button className="uppercase" onClick={onReset}>
              {resetLabel}
            </Button>
          )}
          {showHome && !onReset && (
            <Button className="uppercase" asChild>
              <Link href={homeHref}>{homeLabel}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Preset variants ────────────────────────────────────────────────────────────

export function NotFoundError({ className }: { className?: string }) {
  return (
    <ErrorDisplay
      code="404"
      title="Page Not Found"
      description="Sorry, we couldn't find the page you're looking for. It might have been moved or deleted."
      className={className}
    />
  );
}

export function UnauthorizedError({ className }: { className?: string }) {
  return (
    <ErrorDisplay
      code="401"
      title="Unauthorized Access"
      description="You don't have permission to access this resource. Please log in with the appropriate credentials."
      className={className}
    />
  );
}

export function ForbiddenError({ className }: { className?: string }) {
  return (
    <ErrorDisplay
      code="403"
      title="Access Forbidden"
      description="You don't have the necessary permissions to access this resource."
      className={className}
    />
  );
}

export function GeneralError({
  className,
  minimal = false,
  onReset,
}: {
  className?: string;
  minimal?: boolean;
  onReset?: () => void;
}) {
  return (
    <ErrorDisplay
      code="500"
      title="Something Went Wrong"
      description="We apologize for the inconvenience. An unexpected error has occurred. Please try again later."
      onReset={onReset}
      resetLabel="Try Again"
      showHome={false}
      className={className}
      minimal={minimal}
    />
  );
}

export function MaintenanceError({ className }: { className?: string }) {
  return (
    <ErrorDisplay
      code="503"
      title="Under Maintenance"
      description="We're performing scheduled maintenance. The site will be back online shortly. Thank you for your patience."
      showGoBack={false}
      showHome={true}
      homeLabel="Check Status"
      homeHref="/"
      className={className}
    />
  );
}
