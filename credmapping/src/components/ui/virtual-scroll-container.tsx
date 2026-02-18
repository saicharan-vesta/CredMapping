import { type ReactNode } from "react";
import { cn } from "~/lib/utils";

interface VirtualScrollContainerProps {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  heightClassName?: string;
}

/**
 * Reusable scroll viewport for long entity lists (providers/facilities/etc.)
 * so surrounding page context can remain in view.
 */
export function VirtualScrollContainer({
  children,
  className,
  viewportClassName,
  heightClassName = "h-[65vh]",
}: VirtualScrollContainerProps) {
  return (
    <section className={cn("rounded-lg border bg-card", className)}>
      <div className={cn("overflow-y-auto", heightClassName, viewportClassName)}>{children}</div>
    </section>
  );
}
