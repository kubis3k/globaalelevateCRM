import { cn } from "@/lib/utils"

function initialsOf(name: string) {
  return name
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2)
}

export function Avatar({
  name,
  color,
  className,
}: {
  name: string
  color?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold text-white",
        className
      )}
      style={{ background: color ?? "var(--primary)" }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </div>
  )
}
